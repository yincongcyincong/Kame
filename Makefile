.DEFAULT_GOAL := run

.PHONY: run build frontend backend deps test

run: build
	npm start

build: frontend backend

frontend: deps
	npm run build:frontend

backend:
	npm run build:backend

deps: node_modules/.learning-deps

node_modules/.learning-deps: package.json $(wildcard package-lock.json)
	npm install
	touch $@

test:
	npm test
	cd backend && go test ./...
