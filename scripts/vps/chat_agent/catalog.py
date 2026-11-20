"""Shop process names. The running jars are the target/*.jar files started by run-all.sh."""

SERVICES = {
    "discovery-service": {"module": "discovery-service", "port": 8761, "args": []},
    "cache-service": {"module": "cache-service", "port": 8087, "args": []},
    "auth-service": {"module": "auth-service", "port": 8081, "args": []},
    "user-service": {"module": "user-service", "port": 8082, "args": []},
    "inventory-service": {"module": "inventory-service", "port": 8083, "args": []},
    "order-service": {"module": "order-service", "port": 8084, "args": []},
    "shipping-service": {"module": "shipping-service", "port": 8086, "args": []},
    "report-service": {"module": "report-service", "port": 8088, "args": []},
    "gateway-service": {"module": "gateway-service", "port": 8080, "args": []},
    "payment-1": {
        "module": "payment-service",
        "port": 8085,
        "args": ["--server.port=8085", "--apex.instance-id=payment-1", "--eureka.instance.instance-id=payment-1"],
    },
    "payment-2": {
        "module": "payment-service",
        "port": 8185,
        "args": ["--server.port=8185", "--apex.instance-id=payment-2", "--eureka.instance.instance-id=payment-2"],
    },
    "payment-3": {
        "module": "payment-service",
        "port": 8285,
        "args": ["--server.port=8285", "--apex.instance-id=payment-3", "--eureka.instance.instance-id=payment-3"],
    },
}

PROTECTED = ("postgres", "kafka", "keycloak", "redis")


def resolve(name):
    """Return the process names a user name expands to.

    `payment` is the three payment jars. A single instance name stays one process.
    """
    cleaned = (name or "").strip()
    if cleaned in ("payment", "payment-service"):
        return ["payment-1", "payment-2", "payment-3"]
    if cleaned in SERVICES:
        return [cleaned]
    raise KeyError(cleaned)


def module_of(process_name):
    return SERVICES[process_name]["module"]


def port_of(process_name):
    return SERVICES[process_name]["port"]
