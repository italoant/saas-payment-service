package com.saas.payment.domain.subscription;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Espelha subscription-period.spec.ts.
 */
class SubscriptionPeriodTest {

    private final Instant paidAt = Instant.parse("2026-01-10T12:00:00Z");

    @Test
    void addDaysSomaDiasSemMutarAOrigem() {
        Instant base = Instant.parse("2026-01-01T00:00:00Z");
        Instant result = SubscriptionPeriod.addDays(base, 30);
        assertThat(result).isEqualTo(Instant.parse("2026-01-31T00:00:00Z"));
        // Original (imutavel) nao muda.
        assertThat(base).isEqualTo(Instant.parse("2026-01-01T00:00:00Z"));
    }

    @Test
    void nextPeriodEndPrimeiraConfirmacaoContaDoPagamento() {
        Instant result = SubscriptionPeriod.nextPeriodEnd(null, 30, paidAt);
        assertThat(result).isEqualTo(Instant.parse("2026-02-09T12:00:00Z"));
    }

    @Test
    void nextPeriodEndRenovacaoEmDiaEstendeDoVencimentoAtual() {
        Instant current = Instant.parse("2026-02-01T12:00:00Z");
        Instant result = SubscriptionPeriod.nextPeriodEnd(current, 30, paidAt);
        assertThat(result).isEqualTo(Instant.parse("2026-03-03T12:00:00Z"));
    }

    @Test
    void nextPeriodEndRenovacaoAtrasadaReiniciaNoPagamento() {
        Instant current = Instant.parse("2026-01-05T12:00:00Z");
        Instant result = SubscriptionPeriod.nextPeriodEnd(current, 30, paidAt);
        assertThat(result).isEqualTo(Instant.parse("2026-02-09T12:00:00Z"));
    }

    @Test
    void isOverdueNullEhVencido() {
        assertThat(SubscriptionPeriod.isOverdue(null, paidAt)).isTrue();
    }

    @Test
    void isOverduePeriodoNoFuturoNaoVencido() {
        assertThat(SubscriptionPeriod.isOverdue(Instant.parse("2026-02-01T00:00:00Z"), paidAt)).isFalse();
    }

    @Test
    void isOverduePeriodoNoPassadoVencido() {
        assertThat(SubscriptionPeriod.isOverdue(Instant.parse("2026-01-01T00:00:00Z"), paidAt)).isTrue();
    }
}
