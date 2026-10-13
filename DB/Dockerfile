FROM postgres:17

ENV POSTGRES_DB=amlak

COPY amlak.sql /docker-entrypoint-initdb.d/01-amlak.sql

EXPOSE 5432
