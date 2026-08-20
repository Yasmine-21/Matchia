package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.ProductDto;
import org.matchia.matchiabackend.dto.ProductRequestDto;
import org.matchia.matchiabackend.service.ProductService;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ProductControllerTest {

    @Test
    void readsProductsAndMapsMissingResources() {
        ProductService service = mock(ProductService.class);
        ProductController controller = new ProductController(service);
        ProductDto product = new ProductDto();
        when(service.getById(1L)).thenReturn(product);
        when(service.getByBank(2L)).thenReturn(List.of(product));
        when(service.getByStore(3L)).thenReturn(List.of(product));

        assertThat(controller.getById(1L).getBody()).isEqualTo(product);
        assertThat(controller.getByBank(2L).getBody()).containsExactly(product);
        assertThat(controller.getByStore(3L).getBody()).containsExactly(product);
        when(service.getById(9L)).thenThrow(new RuntimeException());
        assertThat(controller.getById(9L).getStatusCode().value()).isEqualTo(404);
    }

    @Test
    void createsUpdatesAndDeletesJsonProducts() {
        ProductService service = mock(ProductService.class);
        ProductController controller = new ProductController(service);
        ProductRequestDto request = new ProductRequestDto();
        ProductDto product = new ProductDto();
        when(service.create(request)).thenReturn(product);
        when(service.update(1L, request)).thenReturn(product);

        assertThat(controller.create(request).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.update(1L, request).getStatusCode().value()).isEqualTo(200);
        assertThat(controller.delete(1L).getStatusCode().value()).isEqualTo(204);
        when(service.create(request)).thenThrow(new IllegalArgumentException());
        when(service.update(2L, request)).thenThrow(new RuntimeException());
        doThrow(new RuntimeException()).when(service).delete(2L);
        assertThat(controller.create(request).getStatusCode().value()).isEqualTo(400);
        assertThat(controller.update(2L, request).getStatusCode().value()).isEqualTo(404);
        assertThat(controller.delete(2L).getStatusCode().value()).isEqualTo(404);
    }

    @Test
    void buildsMultipartProductRequestsIncludingPriceAndParameters() throws Exception {
        ProductService service = mock(ProductService.class);
        ProductController controller = new ProductController(service);
        ProductDto product = new ProductDto();
        MultipartFile image = mock(MultipartFile.class);
        when(service.create(any(ProductRequestDto.class), eq(image))).thenReturn(product);
        when(service.update(eq(4L), any(ProductRequestDto.class), eq(image))).thenReturn(product);

        assertThat(controller.createMultipart(2L, 3L, "Loan", "desc", "12.50", image,
                "[{\"parameterDefinitionId\":5,\"value\":\"yes\"}]").getStatusCode().value()).isEqualTo(201);
        assertThat(controller.updateMultipart(4L, 2L, 3L, "Loan", null, null, image, null).getStatusCode().value()).isEqualTo(200);
        verify(service).create(argThat(request -> request.getPrice().toString().equals("12.50")
                && request.getParameterValues().size() == 1), eq(image));
    }

    @Test
    void mapsMultipartInputAndStorageErrors() throws Exception {
        ProductService service = mock(ProductService.class);
        ProductController controller = new ProductController(service);
        MultipartFile image = mock(MultipartFile.class);
        when(service.create(any(ProductRequestDto.class), eq(image))).thenThrow(new IllegalArgumentException());

        assertThat(controller.createMultipart(1L, 2L, "name", null, "bad-price", image, null)
                .getStatusCode().value()).isEqualTo(400);
        assertThat(controller.createMultipart(1L, 2L, "name", null, null, image, "invalid-json")
                .getStatusCode().value()).isEqualTo(500);
        assertThat(controller.updateMultipart(1L, 1L, 2L, "name", null, null, image, "not-json")
                .getStatusCode().value()).isEqualTo(500);
    }
}
