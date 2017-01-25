# See: http://clarkgrubb.com/makefile-style-guide
SHELL             := bash
.SHELLFLAGS       := -eu -o pipefail -c
.DEFAULT_GOAL     := default
.DELETE_ON_ERROR:
.SUFFIXES:

# Constants, these can be overwritten in your Makefile.local
BUILD_PACKER := magneticio/packer

# if Makefile.local exists, include it.
ifneq ("$(wildcard Makefile.local)", "")
	include Makefile.local
endif

# Targets
.PHONY: all
all: default

.PHONY: default
default:
	make pack

.PHONY: pack
pack:
	rm -Rf $(CURDIR)/target && mkdir $(CURDIR)/target && \
	cp -R $(CURDIR)/blueprints $(CURDIR)/breeds $(CURDIR)/workflows $(CURDIR)/target/. && \
	export version="$$(git describe --tags)" && \
	docker volume create packer && \
	docker run \
    --rm \
    --name packer \
    --interactive \
    --volume $(CURDIR)/target:/usr/local/src \
    --volume packer:/usr/local/stash \
    $(BUILD_PACKER) \
      vamp-artifacts $${version} && \
  rm -Rf $(CURDIR)/target