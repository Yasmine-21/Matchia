package org.matchia.matchiabackend.dto;

/** Dashboard metric: distinct active marketplaces assigned to a store. */
public record StoreMarketplaceCountDto(Long storeId, String storeName, Long marketplaceCount) { }
