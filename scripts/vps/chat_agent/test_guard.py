from guard import asked_to_apply, emergency_allowed


def test_emergency_words_allow_a_code_edit():
    assert emergency_allowed("this is an emergency, payment is throwing")
    assert emergency_allowed("please open a PR for the null pointer")
    assert emergency_allowed("edit the java in payment service")
    assert emergency_allowed("fix the source of order-service")


def test_ordinary_restart_is_not_an_emergency():
    assert not emergency_allowed("restart payment-1")
    assert not emergency_allowed("how much memory is payment using")
    assert not emergency_allowed("install jcmd and show the heap")
    assert not emergency_allowed("")


def test_apply_is_a_restart_or_package_ask():
    assert asked_to_apply("emergency fix the NPE and restart payment")
    assert not asked_to_apply("emergency, edit the java and open a pull request")
