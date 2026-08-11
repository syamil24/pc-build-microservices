package com.apexbuild.common.messaging;

public final class KafkaTopics {

    public static final String USER_REGISTERED = "apex.user.registered";
    public static final String PAYMENT_SUCCEEDED = "apex.payment.succeeded";
    public static final String PAYMENT_FAILED = "apex.payment.failed";
    public static final String SHIPPING_UPDATED = "apex.shipping.updated";

    private KafkaTopics() {
    }
}
