package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.ClientProfileDto;
import org.matchia.matchiabackend.dto.ClientRegistrationRequest;
import org.matchia.matchiabackend.dto.ClientRegistrationVerificationRequest;
import org.matchia.matchiabackend.dto.ClientRegistrationVerificationResponse;
import org.matchia.matchiabackend.service.ClientRegistrationService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ClientRegistrationControllerTest {

    @Test
    void startsClientRegistrationWithAcceptedResponse() {
        ClientRegistrationService service = mock(ClientRegistrationService.class);
        ClientRegistrationController controller = new ClientRegistrationController(service);
        ClientRegistrationRequest request = new ClientRegistrationRequest();
        ClientRegistrationVerificationResponse response = new ClientRegistrationVerificationResponse("Code envoye", 600, 60);
        when(service.register(request)).thenReturn(response);

        var result = controller.register(request);

        assertThat(result.getStatusCode().value()).isEqualTo(202);
        assertThat(result.getBody()).isSameAs(response);
        verify(service).register(request);
    }

    @Test
    void verifiesCodeAndCreatesProfile() {
        ClientRegistrationService service = mock(ClientRegistrationService.class);
        ClientRegistrationController controller = new ClientRegistrationController(service);
        ClientProfileDto profile = new ClientProfileDto();
        profile.setEmail("client@matchia.com");
        when(service.verifyCode("client@matchia.com", "123456")).thenReturn(profile);

        var result = controller.verify(new ClientRegistrationVerificationRequest("client@matchia.com", "123456"));

        assertThat(result.getStatusCode().value()).isEqualTo(201);
        assertThat(result.getBody()).isSameAs(profile);
        verify(service).verifyCode("client@matchia.com", "123456");
    }
}
