package com.saas.payment.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Credenciais do HTTP Basic Auth que protege a documentacao Swagger.
 *
 * <p>Lidas de {@code swagger.user} / {@code swagger.password} (mapeadas das env
 * {@code SWAGGER_USER} / {@code SWAGGER_PASSWORD}). Padrao apenas para
 * conveniencia inicial — troque em producao.
 */
@ConfigurationProperties(prefix = "swagger")
public class SwaggerProperties {

    private String user = "admin";
    private String password = "changeme";

    public String getUser() {
        return user;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
