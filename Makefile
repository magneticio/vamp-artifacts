# See: http://clarkgrubb.com/makefile-style-guide
SHELL             := bash
.SHELLFLAGS       := -eu -o pipefail -c
.DEFAULT_GOAL     := default
.DELETE_ON_ERROR  :
.SUFFIXES         :

STASH     := stash
PROJECT   := vamp-artifacts
VERSION   := $(shell git describe --tags)
FABRICATOR:= magneticio/fabricator:alpine_3.7_toolbox
TARGET    := $$HOME/.stash/$(PROJECT)

# if Makefile.local exists, include it.
ifneq ("$(wildcard Makefile.local)", "")
	include Makefile.local
endif

.PHONY: clean
clean:
	find "$(CURDIR)" -type d -name "target" | xargs rm -Rf

.PHONY: stash
stash:
	mkdir -p $(TARGET) || true
	cp -r $(CURDIR)/breeds \
	      $(CURDIR)/workflows \
	      $(CURDIR)/blueprints \
	        $(TARGET)

.PHONY: build
build:
	docker run \
         --rm \
         --volume $(STASH):/root \
         --volume $(CURDIR):/$(PROJECT) \
         --workdir=/$(PROJECT) -it \
         $(FABRICATOR) make stash

.PHONY: default
default: clean build
