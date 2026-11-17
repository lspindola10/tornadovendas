import type { IncomingMessage, ServerResponse } from 'http';

interface ClientPayload {
  action?: 'check' | 'register';
  name?: string;
  cpf: string;
  phone?: string;
  email?: string;
  cep?: string;
  address?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  planId?: string;
  dueDate?: number;
  additionalServices?: string[];
  naturalidade?: string;
  birthDate?: string;
  fatherName?: string;
  motherName?: string;
  addressReference?: string;
}

function formatCpf(cpf: string): string {
  const clean = (cpf || '').replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  }
  return cpf || '';
}

function formatCep(cep?: string): string {
  const clean = (cep || '').replace(/\D/g, '');
  if (clean.length === 8) {
    return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
  }
  return cep || '';
}

/**
 * Consulta se o cliente já existe no banco de dados do IXC buscando por CPF formatado ou limpo.
 */
export async function findExistingIxcClientByCpf(cpf: string, authHeader: string, ixcUrl: string) {
  if (!cpf) return null;
  const formattedCpf = formatCpf(cpf);
  const cleanCpf = cpf.replace(/\D/g, '');

  for (const queryVal of [formattedCpf, cleanCpf]) {
    try {
      const res = await fetch(`${ixUrl(ixcUrl)}/webservice/v1/cliente`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'ixcsoft': 'listar',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          qtype: 'cnpj_cpf',
          query: queryVal,
          oper: '=',
          page: '1',
          rp: '1'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.registros && data.registros.length > 0) {
          const item = data.registros[0];
          return {
            id: String(item.id),
            razao: item.razao,
            cnpj_cpf: item.cnpj_cpf,
            ativo: item.ativo,
            data_cadastro: item.data_cadastro
          };
        }
      }
    } catch (e) {
      console.warn('[IXC] Erro ao consultar CPF existente:', e);
    }
  }

  return null;
}

function ixUrl(url: string) {
  return url.replace(/\/$/, '');
}

export async function handleIxcRegistration(payload: ClientPayload) {
  const ixcUrl = ixUrl(process.env.IXC_API_URL || 'https://ixc.tornadonet.net.br');
  const ixcToken = process.env.IXC_API_TOKEN || '15:b743a4400784adde0b8d6232606d014e6ba6d73f532aa876b274fdf0e8a1a182';
  const filialId = process.env.IXC_FILIAL_ID || '1';
  const defaultCityId = process.env.IXC_DEFAULT_CIDADE_ID || '615';

  if (!ixcToken) {
    throw new Error('Token do IXC não configurado no servidor.');
  }

  const base64Auth = Buffer.from(ixcToken.trim()).toString('base64');
  const authHeader = `Basic ${base64Auth}`;

  // Se a ação for apenas CHECAR se o cliente já existe no IXC
  if (payload.action === 'check') {
    const existing = await findExistingIxcClientByCpf(payload.cpf, authHeader, ixcUrl);
    if (existing) {
      return {
        success: true,
        exists: true,
        alreadyExists: true,
        ixcId: existing.id,
        razao: existing.razao,
        ativo: existing.ativo,
        dataCadastro: existing.data_cadastro,
        message: `Cliente já cadastrado no IXC sob o ID #${existing.id} (${existing.razao}).`
      };
    }
    return {
      success: true,
      exists: false,
      alreadyExists: false,
      message: 'Nenhum cadastro com este CPF encontrado no IXC.'
    };
  }

  // --- AÇÃO DE CADASTRO ---
  // REGRA DE PROTEÇÃO: Primeiro verifica se o CPF já existe para NUNCA duplicar
  const existing = await findExistingIxcClientByCpf(payload.cpf, authHeader, ixcUrl);
  if (existing) {
    return {
      success: true,
      alreadyExists: true,
      ixcId: existing.id,
      razao: existing.razao,
      message: `Atenção: O CPF ${payload.cpf} já possui cadastro no IXC sob o ID #${existing.id} (${existing.razao}). Registro vinculado com sucesso sem duplicar!`
    };
  }

  // 1. Tentar encontrar a Cidade e UF corretas no IXC
  let resolvedCidadeId = defaultCityId;
  let resolvedUf = '16'; // Maranhão por padrão

  try {
    const rawCityName = (payload.city || '').split('-')[0].trim();
    if (rawCityName) {
      // 1ª Tentativa: busca exata pelo nome da cidade
      let cityRes = await fetch(`${ixcUrl}/webservice/v1/cidade`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'ixcsoft': 'listar',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          qtype: 'cidade.nome',
          query: rawCityName,
          oper: '=',
          page: '1',
          rp: '10'
        })
      });

      let cityData = cityRes.ok ? await cityRes.json() : null;

      // 2ª Tentativa: busca parcial (LIKE) com limite maior para garantir encontrar no MA
      if (!cityData?.registros || cityData.registros.length === 0) {
        cityRes = await fetch(`${ixcUrl}/webservice/v1/cidade`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'ixcsoft': 'listar',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            qtype: 'cidade.nome',
            query: rawCityName,
            oper: 'L',
            page: '1',
            rp: '50'
          })
        });
        cityData = cityRes.ok ? await cityRes.json() : null;
      }

      if (cityData?.registros && cityData.registros.length > 0) {
        // Prioriza a cidade do estado do Maranhão (UF 16)
        const matched = cityData.registros.find((c: any) => String(c.uf) === '16') || cityData.registros[0];
        resolvedCidadeId = String(matched.id);
        resolvedUf = String(matched.uf || '16');
      }
    }
  } catch (err) {
    console.warn('[IXC] Erro ao buscar cidade, usando cidade padrão:', err);
  }

  // 2. Montar observações do plano e preferências do cliente
  const obsLines = [
    '=== CADASTRO REALIZADO PELO CLIENTE VIA PORTAL WEB ===',
    payload.planId ? `Plano Selecionado: ${payload.planId}` : '',
    payload.dueDate ? `Melhor dia de vencimento: Dia ${payload.dueDate}` : '',
    payload.additionalServices?.length ? `Serviços adicionais: ${payload.additionalServices.join(', ')}` : '',
    payload.addressReference ? `Ponto de Referência: ${payload.addressReference}` : '',
    payload.naturalidade ? `Naturalidade: ${payload.naturalidade}` : '',
    (payload.motherName || payload.fatherName) ? `Filiação: Mãe: ${payload.motherName || '-'} | Pai: ${payload.fatherName || '-'}` : '',
    `Data do cadastro: ${new Date().toLocaleString('pt-BR')}`
  ].filter(Boolean).join('\n');

  // 3. Validar e formatar CEP conforme regras do IXC (obrigatório 8 dígitos e formato 00000-000 com hífen)
  const cleanCep = (payload.cep || '').replace(/\D/g, '');
  if (!cleanCep || cleanCep.length !== 8 || /^0+$/.test(cleanCep)) {
    throw new Error("O campo 'CEP' não pode estar vazio, não pode conter apenas zeros e deve conter 8 dígitos (ex: 65540-000). Corrija o CEP na ficha.");
  }
  const formattedCep = formatCep(payload.cep);

  // 4. Montar dados para inserção no endpoint /webservice/v1/cliente
  const clientBody = {
    ativo: 'S',
    tipo_pessoa: 'F',
    razao: (payload.name || '').toUpperCase().trim(),
    fantasia: (payload.name || '').toUpperCase().trim(),
    cnpj_cpf: formatCpf(payload.cpf),
    ie_identidade: formatCpf(payload.cpf),
    endereco: (payload.address || '').toUpperCase().trim(),
    numero: (payload.number || 'SN').toUpperCase().trim(),
    bairro: (payload.neighborhood || '').toUpperCase().trim(),
    cidade: resolvedCidadeId,
    uf: resolvedUf,
    cep: formattedCep,
    endereco_cob: (payload.address || '').toUpperCase().trim(),
    numero_cob: (payload.number || 'SN').toUpperCase().trim(),
    bairro_cob: (payload.neighborhood || '').toUpperCase().trim(),
    cidade_cob: resolvedCidadeId,
    uf_cob: resolvedUf,
    cep_cob: formattedCep,
    referencia_cob: (payload.addressReference || '').toUpperCase().trim(),
    tipo_assinante: '3', // Residencial
    iss_classificacao_padrao: '99',
    contribuinte_icms: 'N',
    tipo_localidade: 'U', // Urbana
    filial_id: filialId,
    telefone_celular: (payload.phone || '').trim(),
    whatsapp: (payload.phone || '').trim(),
    email: (payload.email || '').toLowerCase().trim(),
    hotsite_email: (payload.email || '').toLowerCase().trim(),
    cob_envia_email: 'S',
    cob_envia_sms: 'S',
    participa_cobranca: 'S',
    data_nascimento: payload.birthDate || '',
    nome_pai: (payload.fatherName || '').toUpperCase().trim(),
    nome_mae: (payload.motherName || '').toUpperCase().trim(),
    referencia: (payload.addressReference || '').toUpperCase().trim(),
    nacionalidade: 'Brasileiro',
    obs: obsLines
  };

  const response = await fetch(`${ixcUrl}/webservice/v1/cliente`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(clientBody)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || (data && data.type === 'error')) {
    const errorMsg = data?.message || `Erro HTTP ${response.status} ao comunicar com o IXC.`;
    const cleanErrorMsg = errorMsg.replace(/<[^>]*>?/gm, ' ').trim();
    throw new Error(cleanErrorMsg);
  }

  return {
    success: true,
    alreadyExists: false,
    ixcId: data?.id ? String(data.id) : undefined,
    message: data?.message || 'Cliente cadastrado com sucesso no IXC!'
  };
}

// Handler para Vercel Serverless Function
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Método não permitido. Utilize POST.' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await handleIxcRegistration(body);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro na API cadastrar-ixc:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Falha ao processar operação no IXC.'
    });
  }
}
