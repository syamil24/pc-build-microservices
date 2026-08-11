package com.apexbuild.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "apex")
public class ApexProperties {

    private String jwtSecret = "";
    private String internalToken = "";
    private boolean demo = true;
    private String instanceId = "local";
    private int accessTokenMinutes = 20;
    private int refreshTokenDays = 7;
    private Cache cache = new Cache();

    public String getJwtSecret() {
        return jwtSecret;
    }

    public void setJwtSecret(String jwtSecret) {
        this.jwtSecret = jwtSecret;
    }

    public String getInternalToken() {
        return internalToken;
    }

    public void setInternalToken(String internalToken) {
        this.internalToken = internalToken;
    }

    public boolean isDemo() {
        return demo;
    }

    public void setDemo(boolean demo) {
        this.demo = demo;
    }

    public String getInstanceId() {
        return instanceId;
    }

    public void setInstanceId(String instanceId) {
        this.instanceId = instanceId;
    }

    public int getAccessTokenMinutes() {
        return accessTokenMinutes;
    }

    public void setAccessTokenMinutes(int accessTokenMinutes) {
        this.accessTokenMinutes = accessTokenMinutes;
    }

    public int getRefreshTokenDays() {
        return refreshTokenDays;
    }

    public void setRefreshTokenDays(int refreshTokenDays) {
        this.refreshTokenDays = refreshTokenDays;
    }

    public Cache getCache() {
        return cache;
    }

    public void setCache(Cache cache) {
        this.cache = cache;
    }

    public static class Cache {
        private boolean clientEnabled = true;

        public boolean isClientEnabled() {
            return clientEnabled;
        }

        public void setClientEnabled(boolean clientEnabled) {
            this.clientEnabled = clientEnabled;
        }
    }
}
