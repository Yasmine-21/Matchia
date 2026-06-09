package org.matchia.matchiabackend.service;

import org.matchia.matchiabackend.dto.BankDto;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.enums.BankStatusEnum;
import org.matchia.matchiabackend.mapper.BankMapper;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Year;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class BankService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern SLUG_PATTERN = Pattern.compile("^[a-z0-9-]+$");

    private final BankRepository bankRepository;
    private final MarketplaceStoreRepository marketplaceStoreRepository;
    private final BankMapper bankMapper;

    @Value("${app.upload.dir:uploads/logos}")
    private String uploadDir;

    public BankService(BankRepository bankRepository, MarketplaceStoreRepository marketplaceStoreRepository, BankMapper bankMapper) {
        this.bankRepository = bankRepository;
        this.marketplaceStoreRepository = marketplaceStoreRepository;
        this.bankMapper = bankMapper;
    }

    public List<BankDto> getAllBanks() {
        return bankRepository.findAll()
                .stream()
                .map(this::toDtoWithCounts)
                .collect(Collectors.toList());
    }

    public BankDto createBank(BankDto bankDto) {
        Bank bank = bankMapper.toEntity(bankDto);
        normalizeAndValidate(bank);
        if (bank.getStatus() == null) {
            bank.setStatus(BankStatusEnum.inactive);
        }
        if (bank.getTotalUsers() == null) {
            bank.setTotalUsers(0);
        }

        return toDtoWithCounts(bankRepository.save(bank));
    }

    public BankDto createBankMultipart(
            MultipartFile logo,
            String name,
            String email,
            String country,
            String slug,
            String websiteUrl,
            String description,
            Integer establishmentYear,
            BankStatusEnum status
    ) throws IOException {
        Bank bank = new Bank();
        bank.setName(name);
        bank.setEmail(email);
        bank.setCountry(country);
        bank.setSlug(slug);
        bank.setWebsiteUrl(websiteUrl);
        bank.setDescription(description);
        bank.setEstablishedYear(establishmentYear);
        bank.setStatus(status != null ? status : BankStatusEnum.inactive);
        bank.setTotalUsers(0);
        bank.setLogoUrl(saveLogo(logo));
        normalizeAndValidate(bank);
        return toDtoWithCounts(bankRepository.save(bank));
    }

    public BankDto updateBank(Long id, BankDto bankDto) {
        Bank existingBank = bankRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Banque non trouvee avec l'id : " + id));

        existingBank.setName(bankDto.getName());
        existingBank.setSlug(bankDto.getSlug());
        existingBank.setEmail(bankDto.getEmail());
        existingBank.setDescription(bankDto.getDescription());
        existingBank.setCountry(bankDto.getCountry());
        existingBank.setWebsiteUrl(bankDto.getWebsiteUrl());
        if (bankDto.getLogoUrl() != null) {
            existingBank.setLogoUrl(bankDto.getLogoUrl());
        }
        existingBank.setEstablishedYear(bankDto.getEstablishmentYear() != null
                ? bankDto.getEstablishmentYear()
                : bankDto.getEstablishedYear());
        if (bankDto.getStatus() != null) {
            existingBank.setStatus(bankDto.getStatus());
        }
        normalizeAndValidate(existingBank);

        return toDtoWithCounts(bankRepository.save(existingBank));
    }

    public BankDto updateBankMultipart(
            Long id,
            MultipartFile logo,
            String name,
            String email,
            String country,
            String slug,
            String websiteUrl,
            String description,
            Integer establishmentYear,
            BankStatusEnum status
    ) throws IOException {
        Bank existingBank = bankRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Banque non trouvee avec l'id : " + id));

        existingBank.setName(name);
        existingBank.setEmail(email);
        existingBank.setCountry(country);
        existingBank.setSlug(slug);
        existingBank.setWebsiteUrl(websiteUrl);
        existingBank.setDescription(description);
        existingBank.setEstablishedYear(establishmentYear);
        if (status != null) {
            existingBank.setStatus(status);
        }
        String logoUrl = saveLogo(logo);
        if (logoUrl != null) {
            existingBank.setLogoUrl(logoUrl);
        }
        normalizeAndValidate(existingBank);
        return toDtoWithCounts(bankRepository.save(existingBank));
    }

    public BankDto updateStatus(Long id, BankStatusEnum status) {
        if (status == null) {
            throw new IllegalArgumentException("Le statut est obligatoire.");
        }
        Bank existingBank = bankRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Banque non trouvee avec l'id : " + id));
        existingBank.setStatus(status);
        return toDtoWithCounts(bankRepository.save(existingBank));
    }

    public void deleteBank(Long id) {
        if (!bankRepository.existsById(id)) {
            throw new RuntimeException("Impossible de supprimer : banque introuvable");
        }
        bankRepository.deleteById(id);
    }

    private void normalizeAndValidate(Bank bank) {
        if (!hasText(bank.getName())) {
            throw new IllegalArgumentException("Le nom de la banque est obligatoire.");
        }
        if (hasText(bank.getEmail()) && !EMAIL_PATTERN.matcher(bank.getEmail().trim()).matches()) {
            throw new IllegalArgumentException("L'email de la banque doit etre valide.");
        }
        if (!hasText(bank.getSlug())) {
            bank.setSlug(toSlug(bank.getName()));
        } else {
            bank.setSlug(toSlug(bank.getSlug()));
        }
        if (!SLUG_PATTERN.matcher(bank.getSlug()).matches()) {
            throw new IllegalArgumentException("Le slug doit contenir uniquement des minuscules, chiffres et tirets.");
        }
        Integer year = bank.getEstablishedYear();
        int currentYear = Year.now().getValue();
        if (year != null && (year < 1800 || year > currentYear)) {
            throw new IllegalArgumentException("L'annee d'etablissement doit etre entre 1800 et " + currentYear + ".");
        }
    }

    private BankDto toDtoWithCounts(Bank bank) {
        BankDto dto = bankMapper.toDto(bank);
        dto.setAssignedStoresCount(bank.getId() != null ? (int) marketplaceStoreRepository.countByMarketplace_Bank_Id(bank.getId()) : 0);
        return dto;
    }

    private String saveLogo(MultipartFile logo) throws IOException {
        if (logo == null || logo.isEmpty()) return null;

        String contentType = logo.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Le logo doit etre une image.");
        }

        String original = logo.getOriginalFilename();
        String extension = original != null && original.contains(".")
                ? original.substring(original.lastIndexOf("."))
                : "";
        String filename = UUID.randomUUID() + extension;
        Path dir = Paths.get(uploadDir);
        if (!Files.exists(dir)) Files.createDirectories(dir);
        Files.copy(logo.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        return "/uploads/logos/" + filename;
    }

    private String toSlug(String value) {
        if (value == null) return "";
        return value.toLowerCase()
                .replaceAll("[^a-z0-9]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
