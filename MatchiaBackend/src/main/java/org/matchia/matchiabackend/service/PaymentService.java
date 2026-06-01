package org.matchia.matchiabackend.service;

import org.matchia.matchiabackend.entity.Request;
import org.springframework.stereotype.Service;

@Service
public class PaymentService {

    public String initiatePayment(Request request) {
        return "http://localhost:5173/saas/demandes?pay_request_id=" + request.getId();
    }
}
