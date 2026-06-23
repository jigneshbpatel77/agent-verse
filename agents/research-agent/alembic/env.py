from logging.config import fileConfig
from alembic import context

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None


def run_migrations_offline() -> None:
    context.configure(url="", target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    raise RuntimeError("Configure SQLAlchemy engine before running online migrations.")


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
