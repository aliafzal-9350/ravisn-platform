from src.graph.nodes.response_generator_node import DEFAULT_PERSONA, _temperature, build_system_prompt


def test_default_prompt_is_unchanged_without_tenant_settings():
    prompt = build_system_prompt("whatsapp", "")

    assert prompt.startswith(DEFAULT_PERSONA)
    assert "Channel: WHATSAPP." in prompt
    assert "Never discuss" not in prompt


def test_tenant_persona_replaces_default_but_keeps_channel_rules():
    prompt = build_system_prompt(
        "instagram",
        "",
        {"system_prompt": "You are {{company_name}}'s concierge for {{contact_name}}.", "company_name": "Acme", "contact_name": "Sam"},
    )

    assert "You are Acme's concierge for Sam." in prompt
    assert DEFAULT_PERSONA not in prompt
    assert "Instagram Direct Message" in prompt


def test_tone_and_prohibited_topics_are_applied():
    prompt = build_system_prompt("whatsapp", "", {"ai_tone": "friendly_efficient", "prohibited_topics": "politics, religion"})

    assert "friendly, efficient tone" in prompt
    assert "Never discuss or speculate about: politics, religion." in prompt


def test_knowledge_context_is_always_appended():
    prompt = build_system_prompt("whatsapp", "Refunds take 5 days.", {"system_prompt": "Custom persona."})

    assert prompt.endswith("Refunds take 5 days.")


def test_temperature_is_clamped_and_defaults_safely():
    assert _temperature(None) == 0.3
    assert _temperature({"temperature": 0.7}) == 0.7
    assert _temperature({"temperature": 5}) == 1.0
    assert _temperature({"temperature": "bad"}) == 0.3
