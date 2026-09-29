package com.apexbuild.payment.chip;

import org.junit.jupiter.api.Test;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChipSignaturesTest {

    @Test
    void acceptsASignatureOverTheRawBody() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        KeyPair pair = generator.generateKeyPair();
        byte[] body = "{\"status\":\"paid\",\"id\":\"abc\"}".getBytes();
        Signature signer = Signature.getInstance("SHA256withRSA");
        signer.initSign(pair.getPrivate());
        signer.update(body);
        String header = Base64.getEncoder().encodeToString(signer.sign());
        String pem = "-----BEGIN PUBLIC KEY-----\n"
                + Base64.getMimeEncoder(64, "\n".getBytes()).encodeToString(pair.getPublic().getEncoded())
                + "\n-----END PUBLIC KEY-----\n";
        assertTrue(ChipSignatures.verify(body, header, pem));
        assertFalse(ChipSignatures.verify("{\"status\":\"failed\"}".getBytes(), header, pem));
    }
}
