package com.saas.payment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Ponto de entrada da aplicacao Spring Boot.
 *
 * Porte Java do saas-payment-service (originalmente NestJS). Mantem a mesma
 * arquitetura hexagonal: o pacote {@code domain} define os ports (interfaces)
 * e use-cases puros; {@code infrastructure} os implementa (JPA + gateway);
 * {@code api} expoe os controllers REST.
 */
@SpringBootApplication
public class SaasPaymentServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(SaasPaymentServiceApplication.class, args);
    }
}
