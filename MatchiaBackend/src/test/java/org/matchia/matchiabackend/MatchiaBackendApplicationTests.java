package org.matchia.matchiabackend;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Disabled("Requires a Docker daemon for the PostgreSQL Testcontainer; Jenkins runs the unit-test suite without Docker.")
@Testcontainers
@SpringBootTest
class MatchiaBackendApplicationTests {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:18")
                    .withDatabaseName("matchia_test")
                    .withUsername("test")
                    .withPassword("test");

    @Test
    void contextLoads() {
    }
}
