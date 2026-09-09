package org.matchia.matchiabackend.service;

import org.springframework.stereotype.Component;
import java.time.Year;
import java.util.UUID;

/** Centralized, collision-resistant reference strategy. References are never recomputed. */
@Component
public class PartnershipContractReferenceGenerator {
    public String next(int version) {
        return "CTR-" + Year.now().getValue() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase() + "-V" + version;
    }
}
