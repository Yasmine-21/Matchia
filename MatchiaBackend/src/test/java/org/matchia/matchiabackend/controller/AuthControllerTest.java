package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.AuthRequest;
import org.matchia.matchiabackend.dto.AuthResponse;
import org.matchia.matchiabackend.dto.ForgotPasswordRequest;
import org.matchia.matchiabackend.dto.ResetPasswordRequest;
import org.matchia.matchiabackend.service.AuthService;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class AuthControllerTest {

    @Test
    void delegatesAuthenticationEndpointsAndReturnsExpectedStatuses() {
        AuthService service = mock(AuthService.class);
        AuthController controller = new AuthController(service);
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        AuthResponse authResponse = new AuthResponse();
        authResponse.setAccessToken("token");
        when(service.login(any(), eq(request), eq(response))).thenReturn(authResponse);
        when(service.refresh(eq(request), eq(response))).thenReturn(authResponse);

        assertThat(controller.login(new AuthRequest(), request, response).getBody()).isSameAs(authResponse);
        assertThat(controller.refresh(request, response).getBody()).isSameAs(authResponse);
        assertThat(controller.currentUser(null, request, response).getStatusCode().value()).isEqualTo(200);
        controller.logout(request, response);

        verify(service).login(any(AuthRequest.class), eq(request), eq(response));
        verify(service).refresh(request, response);
        verify(service).getCurrentUser(null, request, response);
        verify(service).logout(request, response);
    }

    @Test
    void confirmsPasswordResetRequestsWithoutExposingAccountState() {
        AuthService service = mock(AuthService.class);
        AuthController controller = new AuthController(service);
        ForgotPasswordRequest forgot = new ForgotPasswordRequest();
        ResetPasswordRequest reset = new ResetPasswordRequest();

        assertThat(controller.forgotPassword(forgot, new MockHttpServletRequest()).getBody().get("message"))
                .contains("compte correspond");
        assertThat(controller.resetPassword(reset).getBody().get("message"))
                .contains("reinitialise");
        verify(service).sendPasswordResetLink(eq(forgot), any());
        verify(service).resetPassword(reset);
    }
}
