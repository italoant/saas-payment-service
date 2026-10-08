package com.saas.payment.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Metadados da documentacao OpenAPI/Swagger, equivalentes ao
 * {@code DocumentBuilder} do porte NestJS.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI saasPaymentOpenApi() {
        return new OpenAPI().info(new Info()
                .title("SaaS Payment Service")
                .description("Gestao generica de pagamentos para SaaS")
                .version("1.0"));
    }
}
