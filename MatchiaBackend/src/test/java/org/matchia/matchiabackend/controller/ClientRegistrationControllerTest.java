package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.ClientProfileDto;
import org.matchia.matchiabackend.dto.ClientRegistrationRequest;
import org.matchia.matchiabackend.service.ClientRegistrationService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ClientRegistrationControllerTest {

    @Test
    void createsAClientProfile() {
        ClientRegistrationService service = mock(ClientRegistrationService.class);
        ClientRegistrationController controller = new ClientRegistrationController(service);
        ClientRegistrationRequest request = new ClientRegistrationRequest();
        ClientProfileDto profile = new ClientProfileDto();
        profile.setEmail("client@matchia.com");
        when(service.register(request)).thenReturn(profile);

        var response = controller.register(request);

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).isSameAs(profile);
        verify(service).register(request);
    }
}
