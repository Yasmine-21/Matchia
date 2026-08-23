package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.entity.DealerProduct;
import org.matchia.matchiabackend.entity.FinancingRequest;
import org.matchia.matchiabackend.repository.DealerProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class DealerProductStockService {
    private final DealerProductRepository productRepository;

    @Transactional
    public void reserveForAcceptedRequest(FinancingRequest request) {
        if (request.getDealerProduct() == null || Boolean.TRUE.equals(request.getStockReserved())) return;
        DealerProduct product = productRepository.findByIdForUpdate(request.getDealerProduct().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Produit concessionnaire introuvable."));
        if (product.getAvailableStock() == null) return; // Legacy products remain usable until inventory is initialized.
        int available = product.getAvailableStock();
        if (available <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This product is currently out of stock.");
        }
        product.setAvailableStock(available - 1);
        product.setReservedStock((product.getReservedStock() == null ? 0 : product.getReservedStock()) + 1);
        request.setStockReserved(true);
    }

    @Transactional(readOnly = true)
    public void assertAvailable(DealerProduct product) {
        if (product.getAvailableStock() != null && product.getAvailableStock() <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This product is currently out of stock.");
        }
    }
}
