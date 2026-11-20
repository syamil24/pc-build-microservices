import pytest

from catalog import port_of, resolve


def test_payment_expands_to_three_jars():
    assert resolve("payment") == ["payment-1", "payment-2", "payment-3"]
    assert resolve("payment-service") == ["payment-1", "payment-2", "payment-3"]


def test_payment_one_is_only_that_jar():
    assert resolve("payment-1") == ["payment-1"]
    assert port_of("payment-1") == 8085
    assert port_of("payment-2") == 8185
    assert port_of("payment-3") == 8285


def test_gateway_port():
    assert resolve("gateway-service") == ["gateway-service"]
    assert port_of("gateway-service") == 8080


def test_unknown_service_is_rejected():
    with pytest.raises(KeyError):
        resolve("not-a-service")
