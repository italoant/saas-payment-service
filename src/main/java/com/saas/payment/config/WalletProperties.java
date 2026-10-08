package com.saas.payment.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Propriedades da wallet, lidas de {@code wallet.*} (env/application.yml).
 */
@ConfigurationProperties(prefix = "wallet")
public class WalletProperties {

    /** Moeda padrao da wallet (ISO 4217). Default BRL. */
    private String defaultCurrency = "BRL";

    public String getDefaultCurrency() {
        return defaultCurrency;
    }

    public void setDefaultCurrency(String defaultCurrency) {
        this.defaultCurrency = defaultCurrency;
    }
}
