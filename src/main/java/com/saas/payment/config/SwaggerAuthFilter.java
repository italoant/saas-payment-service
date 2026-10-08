package com.saas.payment.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Middleware de HTTP Basic Auth para proteger a documentacao do Swagger (a UI
 * em {@code /doc} e o JSON em {@code /doc-json}), equivalente ao
 * {@code swaggerAuth} do porte NestJS.
 *
 * <p>Credenciais via {@link SwaggerProperties} ({@code SWAGGER_USER} /
 * {@code SWAGGER_PASSWORD}). A comparacao e feita em tempo constante para
 * evitar timing attacks.
 */
@Component
@EnableConfigurationProperties(SwaggerProperties.class)
public class SwaggerAuthFilter extends OncePerRequestFilter {

    private final SwaggerProperties properties;

    public SwaggerAuthFilter(SwaggerProperties properties) {
        this.properties = properties;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Protege a UI do Swagger e o documento OpenAPI (JSON).
        return !(path.startsWith("/doc") || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Basic ")) {
            String encoded = header.substring("Basic ".length()).trim();
            String decoded = new String(Base64.getDecoder().decode(encoded), StandardCharsets.UTF_8);
            int sep = decoded.indexOf(':');
            if (sep >= 0) {
                String givenUser = decoded.substring(0, sep);
                String givenPass = decoded.substring(sep + 1);
                if (safeEqual(givenUser, properties.getUser())
                        && safeEqual(givenPass, properties.getPassword())) {
                    filterChain.doFilter(request, response);
                    return;
                }
            }
        }

        response.setHeader("WWW-Authenticate", "Basic realm=\"Swagger\", charset=\"UTF-8\"");
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("text/plain;charset=UTF-8");
        response.getWriter().write("Authentication required.");
    }

    /** Comparacao em tempo constante (evita timing attacks). */
    private static boolean safeEqual(String a, String b) {
        byte[] bufA = a.getBytes(StandardCharsets.UTF_8);
        byte[] bufB = b.getBytes(StandardCharsets.UTF_8);
        if (bufA.length != bufB.length) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < bufA.length; i++) {
            result |= bufA[i] ^ bufB[i];
        }
        return result == 0;
    }
}
