package org.matchia.matchiabackend.service;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.Locale;

/** Resolves a public marketplace from the request host, not from chatbot input. */
@Service
@RequiredArgsConstructor
public class MarketplaceChatbotContextResolver {
    private final MarketplaceRepository marketplaceRepository;

    public Marketplace resolve(HttpServletRequest request) {
        String slug = tenantFromHost(request.getServerName());
        if (slug == null) {
            slug = tenantFromOrigin(request.getHeader("Origin"));
        }
        // Azure uses one frontend host. Its established tenant request context
        // is the gateway/header slug; it is still resolved and validated here,
        // never accepted as a marketplace id or passed to a database query.
        if (slug == null) {
            slug = normalizeSlug(request.getHeader("X-Bank-Slug"));
        }
        if (slug == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Le chatbot doit etre utilise depuis une marketplace bancaire.");
        }

        return marketplaceRepository.findByBank_Slug(slug)
                .filter(marketplace -> marketplace.getStatus() == MarketplaceStatusEnum.active)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Marketplace introuvable ou inactive."));
    }

    private String tenantFromOrigin(String origin) {
        if (origin == null || origin.isBlank()) return null;
        try {
            return tenantFromHost(URI.create(origin).getHost());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private String tenantFromHost(String host) {
        if (host == null) return null;
        String normalized = host.trim().toLowerCase(Locale.ROOT);
        if (!normalized.endsWith(".lvh.me")) return null;
        String subdomain = normalized.substring(0, normalized.length() - ".lvh.me".length());
        return subdomain.isBlank() || "www".equals(subdomain) ? null : subdomain;
    }

    private String normalizeSlug(String value) {
        if (value == null || value.isBlank()) return null;
        String slug = value.trim().toLowerCase(Locale.ROOT);
        return slug.matches("[a-z0-9-]{2,100}") ? slug : null;
    }
}
