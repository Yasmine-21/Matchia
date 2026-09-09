package org.matchia.matchiabackend.dto;

/**
 * The marketplace is deliberately not part of this request.  It is resolved
 * from the tenant host by the backend, never selected by the browser.
 */
public record MarketplaceChatbotRequest(String message, Long storeId, String conversationId) {
}
