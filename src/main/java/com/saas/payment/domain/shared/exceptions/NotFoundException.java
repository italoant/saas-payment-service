package com.saas.payment.domain.shared.exceptions;

/**
 * Erro de recurso nao encontrado (equivalente ao {@code NotFoundException} do
 * NestJS). Mapeado para HTTP 404 na camada de API.
 */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
