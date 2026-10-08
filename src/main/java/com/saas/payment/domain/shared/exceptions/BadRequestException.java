package com.saas.payment.domain.shared.exceptions;

/**
 * Erro de requisicao invalida (equivalente ao {@code BadRequestException} do
 * NestJS). Mapeado para HTTP 400 na camada de API.
 */
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
