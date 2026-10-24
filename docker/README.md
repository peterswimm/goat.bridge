# Phase-2 dev stack

Spins up Synapse + Element on localhost so you can exercise the Matrix half
end-to-end against `MockGoatClient`. Everything speaks `localhost` with no TLS.

## First-time setup

```bash
# 1. Generate Synapse config (writes synapse-data/homeserver.yaml etc.)
docker compose -f docker/docker-compose.yml run --rm synapse generate

# 2. Hand-edit synapse-data/homeserver.yaml to include the bridge appservice:
#    app_service_config_files:
#      - /data/appservice-registration.yaml
#    enable_registration: true
#    enable_registration_without_verification: true

# 3. Generate the appservice registration from the bridge
cp config/config.sample.yaml config/config.yaml
npm run gen-registration        # writes config/registration.yaml

# 4. Boot Synapse + Element
docker compose -f docker/docker-compose.yml up -d

# 5. Create a user on Synapse (interactive)
docker compose -f docker/docker-compose.yml exec synapse \
  register_new_matrix_user http://localhost:8008 \
  -c /data/homeserver.yaml -u alice -p alice -a

# 6. In another terminal, run the dev bridge (uses MockGoatClient)
npm run dev:mock
```

Open http://localhost:8080, log in as `alice`, create a room, invite
`@goatbot:localhost`, and update `config/config.yaml` so `rooms.roomMap`
maps the room id you just created to a goat channel. Restart `npm run
dev:mock` to pick up the new config.

Any message you type in that room should print as a `Matrix → goat` line
in the dev bridge's stdout. That proves the Matrix half of the pipeline
works independently of goat.computer.

## Tearing down

```bash
docker compose -f docker/docker-compose.yml down
rm -rf docker/synapse-data   # wipes homeserver state
```
