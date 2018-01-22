# See: http://clarkgrubb.com/makefile-style-guide
SHELL             := bash
.SHELLFLAGS       := -eu -o pipefail -c
.DEFAULT_GOAL     := default
.DELETE_ON_ERROR:
.SUFFIXES:

# Constants, these can be overwritten in your Makefile.local
PACKER       ?= packer
BUILD_SERVER := magneticio/buildserver

# if Makefile.local exists, include it.
ifneq ("$(wildcard Makefile.local)", "")
	include Makefile.local
endif

# Don't change these
TARGET  := "$(CURDIR)"/target
VERSION := $(shell git describe --tags)

# Targets
.PHONY: all
all: default

.PHONY: default
default: pack

.PHONY: pack
pack: clean
	mkdir -p $(TARGET)/$(VERSION)
	cp -R "$(CURDIR)"/blueprints "$(CURDIR)"/breeds "$(CURDIR)"/workflows $(TARGET)/$(VERSION)

	docker volume create $(PACKER)
	test "$(DEPS_OK)" = "true" || docker pull $(BUILD_SERVER)
	docker run \
		--rm \
		--volume $(TARGET)/$(VERSION):/usr/local/src \
		--volume $(PACKER):/usr/local/stash \
		$(BUILD_SERVER) \
			push vamp-artifacts $(VERSION)

.PHONY: clean
clean:
	rm -Rf $(TARGET)
