# See: http://clarkgrubb.com/makefile-style-guide
SHELL             := bash
.SHELLFLAGS       := -eu -o pipefail -c
.DEFAULT_GOAL     := default
.DELETE_ON_ERROR:
.SUFFIXES:

# Constants, these can be overwritten in your Makefile.local
BUILD_SERVER := magneticio/buildserver

# if Makefile.local exists, include it.
ifneq ("$(wildcard Makefile.local)", "")
	include Makefile.local
endif

# Don't change these
TARGET  := $(CURDIR)/target
VERSION := $(shell git describe --tags)

# Targets
.PHONY: default
default:
	$(MAKE) pack

.PHONY: pack
pack:
	rm -Rf $(TARGET)
	mkdir $(TARGET)
	mkdir $(TARGET)/$(VERSION)
	cp -R $(CURDIR)/blueprints $(CURDIR)/breeds $(CURDIR)/workflows $(TARGET)

	docker volume create packer
	docker run \
		--rm \
		--volume $(CURDIR)/target:/usr/local/src \
		--volume packer:/usr/local/stash \
		$(BUILD_SERVER) \
			push vamp-artifacts $(VERSION)

	rm -Rf $(CURDIR)/target
