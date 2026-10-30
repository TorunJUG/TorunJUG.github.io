document.documentElement.classList.add("js");

const siteScriptUrl = document.currentScript?.src
  ? new URL(document.currentScript.src)
  : new URL("script.js", window.location.href);

const menuToggle = document.querySelector("[data-menu-toggle]");
const navPanel = document.querySelector("[data-nav-panel]");
const currentYear = document.querySelector("[data-current-year]");
const brandLogos = document.querySelectorAll('img.brand-logo[src$="logo_mini.png"]');

const socialProfiles = [
  {
    name: "YouTube",
    label: "Toruń JUG na YouTube",
    url: "https://www.youtube.com/channel/UCLuHypXd9ODOivs7gRpxNZg",
    icon: "youtube",
  },
  {
    name: "X / Twitter",
    label: "Toruń JUG na X / Twitterze",
    url: "https://twitter.com/TorunJUG",
    icon: "x",
  },
  {
    name: "Facebook",
    label: "Toruń JUG na Facebooku",
    url: "https://www.facebook.com/TorunJUG",
    icon: "facebook",
  },
  {
    name: "LinkedIn",
    label: "Toruń JUG na LinkedIn",
    url: "https://www.linkedin.com/company/106077920",
    icon: "linkedin",
  },
];

const createSocialLinks = (iconSource) => {
  const socialNavigation = document.createElement("nav");
  socialNavigation.className = "header-socials";
  socialNavigation.setAttribute("aria-label", "Media społecznościowe");

  socialProfiles.forEach((profile) => {
    const link = document.createElement("a");
    link.href = profile.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = profile.name;
    link.setAttribute("aria-label", profile.label);

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");

    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `${iconSource}#${profile.icon}`);
    icon.append(use);
    link.append(icon);
    socialNavigation.append(link);
  });

  return socialNavigation;
};

document.querySelectorAll("[data-nav-panel]").forEach((panel) => {
  if (panel.querySelector(".header-socials")) {
    return;
  }

  const logoSource = document.querySelector(".brand-logo")?.getAttribute("src");
  const iconSource = logoSource?.replace("logo_mini.png", "social-icons.svg");
  const primaryNavigation = panel.querySelector("nav");

  if (iconSource && primaryNavigation) {
    primaryNavigation.after(createSocialLinks(iconSource));
  }
});

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

const counters = document.querySelectorAll("[data-counter]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const animateCounter = (counter) => {
  const target = Number(counter.dataset.counter);

  if (!Number.isFinite(target) || prefersReducedMotion) {
    counter.textContent = String(target);
    return;
  }

  const duration = 1400;
  const startTime = performance.now();

  const updateCounter = (currentTime) => {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    counter.textContent = String(Math.round(target * easedProgress));

    if (progress < 1) {
      window.requestAnimationFrame(updateCounter);
    }
  };

  window.requestAnimationFrame(updateCounter);
};

if (counters.length > 0 && !prefersReducedMotion && "IntersectionObserver" in window) {
  counters.forEach((counter) => {
    counter.textContent = "0";
  });

  const countersObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      animateCounter(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.45 });

  counters.forEach((counter) => countersObserver.observe(counter));
}

document.querySelectorAll("[data-meetings-carousel]").forEach((carousel) => {
  const viewport = carousel.querySelector("[data-meetings-viewport]");
  const items = Array.from(carousel.querySelectorAll(".meetings-list > li"));
  const previousButton = carousel.querySelector("[data-carousel-previous]");
  const nextButton = carousel.querySelector("[data-carousel-next]");
  const progress = carousel.querySelector("[data-carousel-progress]");
  const position = carousel.querySelector("[data-carousel-position]");

  if (!viewport || items.length === 0 || !previousButton || !nextButton || !progress || !position) {
    return;
  }

  let currentIndex = 0;
  let frameId;

  const getStep = () => {
    if (items.length < 2) {
      return viewport.clientWidth;
    }

    return items[1].offsetLeft - items[0].offsetLeft;
  };

  const getMaxIndex = () => {
    const step = getStep();
    return step > 0 ? Math.round((viewport.scrollWidth - viewport.clientWidth) / step) : 0;
  };

  const updateControls = () => {
    const step = getStep();
    const maxIndex = getMaxIndex();
    currentIndex = step > 0 ? Math.min(maxIndex, Math.round(viewport.scrollLeft / step)) : 0;

    const visibleCount = Math.min(items.length - currentIndex, Math.max(1, Math.round(viewport.clientWidth / step)));
    const firstVisible = currentIndex + 1;
    const lastVisible = Math.min(items.length, firstVisible + visibleCount - 1);

    progress.max = String(maxIndex);
    progress.value = String(currentIndex);
    progress.setAttribute(
      "aria-valuetext",
      firstVisible === lastVisible
        ? `Spotkanie ${firstVisible} z ${items.length}`
        : `Spotkania ${firstVisible} do ${lastVisible} z ${items.length}`
    );
    position.textContent = firstVisible === lastVisible
      ? `${firstVisible} z ${items.length}`
      : `${firstVisible}–${lastVisible} z ${items.length}`;
    previousButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === maxIndex;
  };

  const scrollToIndex = (index) => {
    const maxIndex = getMaxIndex();
    const nextIndex = Math.max(0, Math.min(maxIndex, index));
    const maximumScroll = viewport.scrollWidth - viewport.clientWidth;
    viewport.scrollTo({
      left: Math.min(nextIndex * getStep(), maximumScroll),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  previousButton.addEventListener("click", () => scrollToIndex(currentIndex - 1));
  nextButton.addEventListener("click", () => scrollToIndex(currentIndex + 1));
  progress.addEventListener("input", () => scrollToIndex(Number(progress.value)));

  viewport.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      scrollToIndex(currentIndex + (event.key === "ArrowRight" ? 1 : -1));
    }
  });

  viewport.addEventListener("scroll", () => {
    window.cancelAnimationFrame(frameId);
    frameId = window.requestAnimationFrame(updateControls);
  }, { passive: true });

  window.addEventListener("resize", updateControls);
  updateControls();
});

brandLogos.forEach((logo) => {
  const staticSource = logo.getAttribute("src");
  const animatedSource = staticSource.replace("logo_mini.png", "logo_mini_animated.gif");

  logo.addEventListener("mouseenter", () => {
    logo.src = `${animatedSource}?restart=${Date.now()}`;
  });

  logo.addEventListener("mouseleave", () => {
    logo.src = staticSource;
  });
});

const setupGameEasterEgg = () => {
  const logo = document.querySelector(".site-header .brand-logo");
  const desktopPointer = window.matchMedia("(min-width: 961px) and (hover: hover) and (pointer: fine)");

  if (!logo) {
    return;
  }

  const logoLink = logo.closest(".brand");
  let hoverTimer;
  let progressDelayTimer;
  let progressFrame;
  let hoverStartedAt;
  let gameDialog;
  let gameFrame;
  let loadingTimeout;
  let revealTimeout;
  let gameOpenedAt;
  let isGameOpen = false;
  const LOADER_MIN_DURATION_MS = 1500;
  const LOADER_FADE_MS = 500;
  const allowedGameMessages = new Set(["booting", "ready", "completed", "close", "error"]);
  const expectedGameOrigin = window.location.protocol === "file:" ? "null" : window.location.origin;

  const clearHoverTimer = () => {
    window.clearTimeout(hoverTimer);
    window.clearTimeout(progressDelayTimer);
    window.cancelAnimationFrame(progressFrame);
    hoverTimer = undefined;
    progressDelayTimer = undefined;
    progressFrame = undefined;
    hoverStartedAt = undefined;
    logoLink?.classList.remove("tjug-game-countdown");
    logoLink?.style.removeProperty("--tjug-game-progress");
  };

  const updateHoverProgress = (currentTime) => {
    if (hoverStartedAt === undefined || !logoLink) {
      return;
    }

    const progress = Math.min(100, Math.max(0, ((currentTime - hoverStartedAt - 5000) / 5000) * 100));
    logoLink.style.setProperty("--tjug-game-progress", progress.toFixed(2));

    if (progress < 100) {
      progressFrame = window.requestAnimationFrame(updateHoverProgress);
    }
  };

  const closeGame = () => {
    if (!isGameOpen) {
      return;
    }

    isGameOpen = false;
    window.clearTimeout(loadingTimeout);
    window.clearTimeout(revealTimeout);
    window.removeEventListener("message", handleGameMessage);
    document.body.classList.remove("tjug-game-open");

    if (gameDialog?.open && typeof gameDialog.close === "function") {
      gameDialog.close();
    }

    gameDialog?.remove();
    gameDialog = undefined;
    gameFrame = undefined;
    logoLink?.focus({ preventScroll: true });
  };

  const showLoadError = () => {
    window.clearTimeout(loadingTimeout);
    const loader = gameDialog?.querySelector("[data-game-loader]");
    if (!loader) {
      return;
    }

    loader.classList.add("is-error");
    loader.innerHTML = `
      <p class="tjug-game-loader-title">Nie udało się uruchomić gry.</p>
      <button class="tjug-game-return" type="button">Wróć do strony</button>
    `;
    loader.querySelector("button")?.addEventListener("click", closeGame);
  };

  // Keep the loader up for a moment, cross-fade it into the game's title screen,
  // and only then let the game start its title animation.
  const revealGame = () => {
    gameDialog?.classList.add("is-ready");
    gameFrame.title = "Piernikowy Quest — minigra Toruń JUG";
    revealTimeout = window.setTimeout(() => {
      gameFrame?.contentWindow?.postMessage(
        { source: "tjug-site", type: "start-title" },
        window.location.protocol === "file:" ? "*" : window.location.origin
      );
    }, LOADER_FADE_MS);
  };

  function handleGameMessage(event) {
    if (
      !gameFrame
      || event.source !== gameFrame.contentWindow
      || event.origin !== expectedGameOrigin
      || event.data?.source !== "tjug-piernikowy-quest"
      || !allowedGameMessages.has(event.data.type)
    ) {
      return;
    }

    if (event.data.type === "ready") {
      window.clearTimeout(loadingTimeout);
      revealTimeout = window.setTimeout(
        revealGame,
        Math.max(0, LOADER_MIN_DURATION_MS - (performance.now() - gameOpenedAt))
      );
    } else if (event.data.type === "error") {
      window.clearTimeout(loadingTimeout);
      showLoadError();
    } else if (event.data.type === "close") {
      closeGame();
    }
  }

  const openGame = () => {
    if (isGameOpen || !desktopPointer.matches || document.hidden) {
      return;
    }

    isGameOpen = true;
    gameOpenedAt = performance.now();
    clearHoverTimer();
    document.body.classList.add("tjug-game-open");

    if (!document.querySelector("[data-game-font]")) {
      const gameFont = document.createElement("link");
      gameFont.rel = "stylesheet";
      gameFont.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
      gameFont.dataset.gameFont = "";
      document.head.append(gameFont);
    }

    gameDialog = document.createElement("dialog");
    gameDialog.className = "tjug-game-dialog";
    gameDialog.setAttribute("aria-label", "Piernikowy Quest");
    gameDialog.innerHTML = `
      <div class="tjug-game-shell">
        <button class="tjug-game-close" type="button" aria-label="Zamknij grę">×</button>
        <div class="tjug-game-loader" data-game-loader role="status" aria-live="polite">
          <span class="tjug-game-loader-icon" aria-hidden="true"></span>
          <p class="tjug-game-loader-title">Ładowanie Piernikowego Questu…</p>
          <p>Przygotowujemy mapę i chowamy pierniki.</p>
        </div>
      </div>
    `;

    gameFrame = document.createElement("iframe");
    gameFrame.className = "tjug-game-frame";
    gameFrame.title = "Ładowanie minigry";
    gameFrame.src = new URL("./static/game/game.html", siteScriptUrl).href;
    gameFrame.addEventListener("error", showLoadError, { once: true });
    gameDialog.querySelector(".tjug-game-shell").append(gameFrame);
    gameDialog.querySelector(".tjug-game-close").addEventListener("click", closeGame);
    gameDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeGame();
    });

    window.addEventListener("message", handleGameMessage);
    document.body.append(gameDialog);

    if (typeof gameDialog.showModal === "function") {
      gameDialog.showModal();
    } else {
      gameDialog.setAttribute("open", "");
    }

    loadingTimeout = window.setTimeout(showLoadError, 20000);
  };

  const startHoverTimer = (event) => {
    if (event.pointerType !== "mouse" || !desktopPointer.matches || isGameOpen) {
      return;
    }

    clearHoverTimer();
    hoverStartedAt = performance.now();
    progressDelayTimer = window.setTimeout(() => {
      logoLink?.classList.add("tjug-game-countdown");
      logoLink?.style.setProperty("--tjug-game-progress", "0");
      progressFrame = window.requestAnimationFrame(updateHoverProgress);
    }, 5000);
    hoverTimer = window.setTimeout(() => {
      window.cancelAnimationFrame(progressFrame);
      logoLink?.style.setProperty("--tjug-game-progress", "100");
      progressFrame = window.requestAnimationFrame(openGame);
    }, 10000);
  };

  logo.addEventListener("pointerenter", startHoverTimer);
  logo.addEventListener("pointerleave", clearHoverTimer);
  window.addEventListener("blur", clearHoverTimer);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearHoverTimer();
    }
  });
  desktopPointer.addEventListener("change", (event) => {
    if (!event.matches) {
      clearHoverTimer();
      closeGame();
    }
  });
};

setupGameEasterEgg();

if (menuToggle && navPanel) {
  const closeMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Otwórz menu");
    navPanel.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  };

  const openMenu = () => {
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Zamknij menu");
    navPanel.classList.add("is-open");
    document.body.classList.add("menu-open");
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  navPanel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      closeMenu();
      menuToggle.focus();
    }
  });

  window.matchMedia("(min-width: 961px)").addEventListener("change", (event) => {
    if (event.matches) {
      closeMenu();
    }
  });
}
