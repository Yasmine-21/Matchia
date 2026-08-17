package org.matchia.matchiabackend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir:uploads/logos}")
    private String uploadDir;

    @Value("${app.content.upload.dir:uploads/content}")
    private String contentUploadDir;

    @Value("${app.marketplace-content.upload.dir:uploads/marketplace-content}")
    private String marketplaceContentUploadDir;

    @Value("${app.product.upload.dir:uploads/products}")
    private String productUploadDir;

    @Value("${app.dealer.upload.dir:uploads/dealers}")
    private String dealerUploadDir;

    @Value("${app.dealer.product.upload.dir:uploads/dealer-products}")
    private String dealerProductUploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/uploads/logos/**")
                .addResourceLocations(uploadPath.toUri().toString());

        Path contentUploadPath = Paths.get(contentUploadDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/uploads/content/**")
                .addResourceLocations(contentUploadPath.toUri().toString());

        Path marketplaceContentUploadPath = Paths.get(marketplaceContentUploadDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/uploads/marketplace-content/**")
                .addResourceLocations(marketplaceContentUploadPath.toUri().toString());

        Path productUploadPath = Paths.get(productUploadDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/uploads/products/**")
                .addResourceLocations(productUploadPath.toUri().toString());

        Path dealerLogoUploadPath = Paths.get(dealerUploadDir, "logos").toAbsolutePath().normalize();
        registry.addResourceHandler("/uploads/dealers/logos/**")
                .addResourceLocations(dealerLogoUploadPath.toUri().toString());

        Path dealerContactPhotoUploadPath = Paths.get(dealerUploadDir, "contact-photos").toAbsolutePath().normalize();
        registry.addResourceHandler("/uploads/dealers/contact-photos/**")
                .addResourceLocations(dealerContactPhotoUploadPath.toUri().toString());

        Path dealerProductUploadPath = Paths.get(dealerProductUploadDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/uploads/dealer-products/**")
                .addResourceLocations(dealerProductUploadPath.toUri().toString());
    }
}
