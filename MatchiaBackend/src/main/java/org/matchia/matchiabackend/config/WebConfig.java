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
    }
}
