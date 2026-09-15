document.documentElement.classList.add("js");

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
    return step > 0 ? Math.ceil((viewport.scrollWidth - viewport.clientWidth) / step) : 0;
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
