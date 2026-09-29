package com.apexbuild.payment.chip;

import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * Verifies CHIP Collect callbacks. The X-Signature header is a base64 RSA
 * PKCS#1 v1.5 signature over the raw body, using SHA-256.
 * See https://docs.chip-in.asia/chip-collect/overview/webhook-signatures
 */
public final class ChipSignatures {

    private ChipSignatures() {
    }

    public static boolean verify(byte[] body, String signatureBase64, String publicKeyPem) {
        if (body == null || signatureBase64 == null || signatureBase64.isBlank() || publicKeyPem == null || publicKeyPem.isBlank()) {
            return false;
        }
        try {
            Signature signature = Signature.getInstance("SHA256withRSA");
            signature.initVerify(publicKey(publicKeyPem));
            signature.update(body);
            return signature.verify(Base64.getDecoder().decode(signatureBase64.trim()));
        } catch (Exception ex) {
            return false;
        }
    }

    public static PublicKey publicKey(String pem) throws Exception {
        String normalized = pem.replace("\\n", "\n")
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s", "");
        byte[] decoded = Base64.getDecoder().decode(normalized);
        return KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(decoded));
    }
}
