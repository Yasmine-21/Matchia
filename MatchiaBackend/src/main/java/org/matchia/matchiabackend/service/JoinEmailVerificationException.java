package org.matchia.matchiabackend.service;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class JoinEmailVerificationException extends RuntimeException {

    private final HttpStatus status;
    private final long retryAfterSeconds;

    public JoinEmailVerificationException(HttpStatus status, String message) {
        this(status, message, 0);
    }

    public JoinEmailVerificationException(HttpStatus status, String message, long retryAfterSeconds) {
        super(message);
        this.status = status;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
