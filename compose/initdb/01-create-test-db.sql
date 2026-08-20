-- Runs once, on first initialisation of the Postgres data directory, via
-- the official image's /docker-entrypoint-initdb.d hook. Executed as
-- POSTGRES_USER (dbadmin), which the image creates as a superuser - so it
-- can create further roles and databases.
--
-- Creates the test database alongside the dev one (boilerplatedb, created
-- automatically from POSTGRES_DB) so a single Postgres instance serves both.
-- Values match TestSettings in backend/app/core/settings/test.py.

CREATE ROLE testdbadmin LOGIN PASSWORD 'password';
CREATE DATABASE boilerplatetestdb OWNER testdbadmin;