import type { IncomingMessage, ServerResponse } from 'http';

interface ClientPayload {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  cep: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  planId?: string;
  dueDate?: number;
  additionalServices?: string[];
  naturalidade?: string;
  birthDate?: string;
  fatherName?: string;
  motherName?: string;
  addressReference?: string;
}

export async function handleIxcRegistration(payload: ClientPayload) {
  const ixcUrl = (process.env.IXC_API_URL || 'https://ixc.tornadonet.net.br').replace(/\/$/, '');
  const ixcToken = process.env.IXC_API_TOKEN || '15:b743a4400784adde0b8d6232606d014e6ba6d73f532aa876b274fdf0e8a1a182';
  const filialId = process.env.IXC_FILIAL_ID || '1';
  const defaultCityId = process.env.IXC_DEFAULT_CIDADE_ID || '615';

  if (!ixcToken) {
    throw new Error('Token do IXC não configurado no servidor.');
  }

  const base64Auth = Buffer.from(ixcToken.trim()).toString('base64');
  const authHeader = `Basic ${base64Auth}`;

  // 1. Tentar encontrar a Cidade e UF corretas no IXC
  let resolvedCidadeId = defaultCityId;
  let resolvedUf = '16'; // Maranhão por padrão

  try {
    const rawCityName = (payload.city || '').split('-')[0].trim();
    if (rawCityName) {
      const cityRes = await fetch(`${ixcUrl}/webservice/v1/cidade`, {
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
          rp: '5'
        })
      });

      if (cityRes.ok) {
        const cityData = await cityRes.json();
        if (cityData?.registros && cityData.registros.length > 0) {
          // Prioriza cidade do Maranhão (uf 16) ou pega a primeira correspondente
          const matched = cityData.registros.find((c: any) => c.uf === '16') || cityData.registros[0];
          resolvedCidadeId = String(matched.id);
          resolvedUf = String(matched.uf || '16');
        }
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
    `Data do cadastro: ${new Date().toLocaleString('pt-BR')}`
  ].filter(Boolean).join(' | ');

  // 3. Montar dados para inserção no endpoint /webservice/v1/cliente
  const clientBody = {
    ativo: 'S',
    tipo_pessoa: 'F',
    razao: (payload.name || '').toUpperCase().trim(),
    fantasia: (payload.name || '').toUpperCase().trim(),
    cnpj_cpf: (payload.cpf || '').trim(),
    ie_identidade: (payload.cpf || '').trim(),
    endereco: (payload.address || '').toUpperCase().trim(),
    numero: (payload.number || 'SN').toUpperCase().trim(),
    bairro: (payload.neighborhood || '').toUpperCase().trim(),
    cidade: resolvedCidadeId,
    uf: resolvedUf,
    cep: (payload.cep || '').replace(/\D/g, ''),
    tipo_assinante: '3', // Residencial
    iss_classificacao_padrao: '99',
    contribuinte_icms: 'N',
    tipo_localidade: 'U', // Urbana
    filial_id: filialId,
    telefone_celular: (payload.phone || '').trim(),
    whatsapp: (payload.phone || '').trim(),
    email: (payload.email || '').toLowerCase().trim(),
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
    // Remove tags HTML como <br /> da mensagem do IXC
    const cleanErrorMsg = errorMsg.replace(/<[^>]*>?/gm, ' ').trim();
    throw new Error(cleanErrorMsg);
  }

  return {
    success: true,
    ixcId: data?.id ? String(data.id) : undefined,
    message: data?.message || 'Cliente cadastrado com sucesso no IXC!'
  };
}

// Handler para Vercel Serverless Function
export default async function handler(req: any, res: any) {
  // Configuração de CORS se necessário
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
      error: error.message || 'Falha ao processar cadastro no IXC.'
    });
  }
}
