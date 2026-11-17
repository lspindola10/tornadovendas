import { Client } from '../types';

export interface IxcRegisterResponse {
  success: boolean;
  ixcId?: string;
  alreadyExists?: boolean;
  razao?: string;
  message?: string;
  error?: string;
}

export interface IxcCheckResponse {
  success: boolean;
  exists?: boolean;
  alreadyExists?: boolean;
  ixcId?: string;
  razao?: string;
  ativo?: string;
  dataCadastro?: string;
  message?: string;
  error?: string;
}

/**
 * Consulta se o CPF do cliente já existe no banco de dados do IXC.
 */
export async function checkClientInIxc(cpf: string): Promise<IxcCheckResponse> {
  try {
    const response = await fetch('/api/cadastrar-ixc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'check',
        cpf
      })
    });
    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Falha ao consultar IXC.'
    };
  }
}

/**
 * Envia os dados do cliente para a API segura que realiza o cadastro direto no IXC Soft.
 * Se o cliente já existir no IXC, ele apenas vincula o registro sem duplicar!
 */
export async function sendClientToIxc(client: Client): Promise<IxcRegisterResponse> {
  try {
    const response = await fetch('/api/cadastrar-ixc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'register',
        name: client.name,
        cpf: client.cpf,
        phone: client.phone,
        email: client.email,
        cep: client.cep,
        address: client.address,
        number: client.number,
        neighborhood: client.neighborhood,
        city: client.city,
        planId: client.planId,
        dueDate: client.dueDate,
        additionalServices: client.additionalServices,
        naturalidade: client.naturalidade,
        birthDate: client.birthDate,
        fatherName: client.fatherName,
        motherName: client.motherName,
        addressReference: client.addressReference
      })
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Falha na conexão com a API de integração do IXC.'
    };
  }
}
