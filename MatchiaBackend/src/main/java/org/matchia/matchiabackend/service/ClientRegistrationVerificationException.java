package org.matchia.matchiabackend.service;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ClientRegistrationVerificationException extends RuntimeException {
    private final HttpStatus status;
    private final long retryAfterSeconds;

    public ClientRegistrationVerificationException(HttpStatus status, String message) {
        this(status, message, 0);
    }

    public ClientRegistrationVerificationException(HttpStatus status, String message, long retryAfterSeconds) {
        super(message);
        this.status = status;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
