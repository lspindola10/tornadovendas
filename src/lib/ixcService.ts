import { Client } from '../types';

export interface IxcRegisterResponse {
  success: boolean;
  ixcId?: string;
  message?: string;
  error?: string;
}

/**
 * Envia os dados do cliente para a API segura que realiza o cadastro direto no IXC Soft.
 */
export async function sendClientToIxc(client: Client): Promise<IxcRegisterResponse> {
  try {
    const response = await fetch('/api/cadastrar-ixc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
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
