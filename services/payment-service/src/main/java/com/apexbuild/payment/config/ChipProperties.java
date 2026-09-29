package com.apexbuild.payment.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "apex.chip")
public class ChipProperties {

    private String mode = "demo";
    private String apiBase = "https://gate.chip-in.asia/api/v1";
    private String secretKey = "";
    private String brandId = "";
    private String publicKey = "";
    private String successCallback = "";
    private String successRedirect = "http://localhost:5173/orders";
    private String failureRedirect = "http://localhost:5173/checkout";
    private String webappOrigin = "http://localhost:5173";

    public boolean live() {
        return "live".equalsIgnoreCase(mode);
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getApiBase() {
        return apiBase;
    }

    public void setApiBase(String apiBase) {
        this.apiBase = apiBase;
    }

    public String getSecretKey() {
        return secretKey;
    }

    public void setSecretKey(String secretKey) {
        this.secretKey = secretKey;
    }

    public String getBrandId() {
        return brandId;
    }

    public void setBrandId(String brandId) {
        this.brandId = brandId;
    }

    public String getPublicKey() {
        return publicKey;
    }

    public void setPublicKey(String publicKey) {
        this.publicKey = publicKey;
    }

    public String getSuccessCallback() {
        return successCallback;
    }

    public void setSuccessCallback(String successCallback) {
        this.successCallback = successCallback;
    }

    public String getSuccessRedirect() {
        return successRedirect;
    }

    public void setSuccessRedirect(String successRedirect) {
        this.successRedirect = successRedirect;
    }

    public String getFailureRedirect() {
        return failureRedirect;
    }

    public void setFailureRedirect(String failureRedirect) {
        this.failureRedirect = failureRedirect;
    }

    public String getWebappOrigin() {
        return webappOrigin;
    }

    public void setWebappOrigin(String webappOrigin) {
        this.webappOrigin = webappOrigin;
    }
}
