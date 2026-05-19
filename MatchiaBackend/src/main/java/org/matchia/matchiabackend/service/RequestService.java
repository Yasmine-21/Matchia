package org.matchia.matchiabackend.service;

import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.repository.RequestRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class RequestService {

    private final RequestRepository requestRepository;

    public RequestService(RequestRepository requestRepository) {
        this.requestRepository = requestRepository;
    }

    /**
     * Create or update a Request.
     * @param request The Request to save.
     * @return The saved Request.
     */
    public Request save(Request request) {
        return requestRepository.save(request);
    }

    /**
     * Get all Requests.
     * @return List of Request.
     */
    public List<Request> findAll() {
        return requestRepository.findAll();
    }

    /**
     * Find a Request by its ID.
     * @param id The ID of the Request.
     * @return An Optional containing the Request if found.
     */
    public Optional<Request> findById(Long id) {
        return requestRepository.findById(id);
    }

    /**
     * Delete a Request by its ID.
     * @param id The ID of the Request to delete.
     */
    public void deleteById(Long id) {
        requestRepository.deleteById(id);
    }
}
