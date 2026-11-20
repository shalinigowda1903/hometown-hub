const API_BASE_URL = window.HOMETOWN_API_URL || "http://localhost:5000/api";
const CURRENT_KEY = "hometownHubCurrentUser";

const readCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem(CURRENT_KEY));
  } catch {
    return null;
  }
};

const saveCurrentUser = (user) => {
  localStorage.setItem(CURRENT_KEY, JSON.stringify(user));
};

const request = async (path, options = {}) => {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  } catch {
    throw new Error("Cannot connect to Hometown Hub. Please start the backend and try again.");
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "The request could not be completed.");
  }
  return result;
};

const showMessage = (element, message, isError = false) => {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("form-message-error", isError);
};

const bindAuthForm = (formId, submitPath, getPayload) => {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.getElementById("formMessage");
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    showMessage(message, "Please wait...");

    try {
      const result = await request(submitPath, {
        method: "POST",
        body: JSON.stringify(getPayload())
      });
      saveCurrentUser(result.user);
      showMessage(message, result.message || "Success. Opening your dashboard...");
      window.location.href = "dashboard.html";
    } catch (error) {
      showMessage(message, error.message, true);
    } finally {
      submitButton.disabled = false;
    }
  });
};

bindAuthForm("registerForm", "/auth/register", () => ({
  name: document.getElementById("name").value.trim(),
  email: document.getElementById("regEmail").value.trim(),
  hometown: document.getElementById("hometown").value.trim(),
  password: document.getElementById("regPassword").value
}));

bindAuthForm("loginForm", "/auth/login", () => ({
  email: document.getElementById("email").value.trim(),
  password: document.getElementById("password").value
}));

const currentUser = readCurrentUser();
const welcomeName = document.getElementById("welcomeName");

if (welcomeName) {
  if (!currentUser) {
    window.location.href = "login.html";
  } else {
    welcomeName.textContent = currentUser.name;
    const welcomeNameCard = document.getElementById("welcomeNameCard");
    const welcomeNameComposer = document.getElementById("welcomeNameComposer");
    const welcomeTown = document.getElementById("welcomeTown");
    const welcomeTownPost = document.getElementById("welcomeTownPost");
    const townTitle = document.getElementById("townTitle");

    if (welcomeNameCard) welcomeNameCard.textContent = currentUser.name;
    if (welcomeNameComposer) welcomeNameComposer.textContent = currentUser.name;
    if (welcomeTown) welcomeTown.textContent = currentUser.hometown;
    if (welcomeTownPost) welcomeTownPost.textContent = currentUser.hometown;
    if (townTitle) townTitle.textContent = `${currentUser.hometown} community`;
    const communityName = document.getElementById("communityName");
    if (communityName) communityName.textContent = currentUser.hometown;
  }
}

const postsList = document.getElementById("postsList");
const feedMessage = document.getElementById("feedMessage");

const formatDate = (date) => {
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? date : value.toLocaleString();
};

const notificationsList = document.getElementById("notificationsList");

const renderNotifications = (posts) => {
  if (!notificationsList) return;
  notificationsList.replaceChildren();

  if (!posts.length) {
    const emptyState = document.createElement("li");
    emptyState.className = "notification-empty";
    emptyState.textContent = "No community updates yet.";
    notificationsList.append(emptyState);
    return;
  }

  posts.forEach((post) => {
    const notification = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = `${post.author} shared an update`;
    const text = document.createElement("span");
    text.textContent = post.text;
    const date = document.createElement("small");
    date.textContent = formatDate(post.date);
    notification.append(title, text, date);
    notificationsList.append(notification);
  });
};

const renderPosts = (posts, openCommentIds = new Set()) => {
  if (!postsList) return;
  postsList.replaceChildren();

  if (!posts.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "post-card";
    const heading = document.createElement("h3");
    heading.textContent = "Welcome to your community!";
    const text = document.createElement("p");
    text.textContent = "Be the first to share a local update, announcement or good news.";
    emptyState.append(heading, text);
    postsList.append(emptyState);
    return;
  }

  posts.forEach((post) => {
    const card = document.createElement("article");
    card.className = "post-card";

    const meta = document.createElement("div");
    meta.className = "post-meta";
    const avatar = document.createElement("span");
    avatar.className = "avatar avatar-green";
    avatar.textContent = "👤";
    const author = document.createElement("div");
    const authorName = document.createElement("h3");
    authorName.textContent = post.author;
    const date = document.createElement("small");
    date.textContent = formatDate(post.date);
    author.append(authorName, date);
    meta.append(avatar, author);

    const body = document.createElement("p");
    body.textContent = post.text;

    const actions = document.createElement("div");
    actions.className = "post-actions";
    const like = document.createElement("button");
    like.type = "button";
    like.textContent = `♡ Like (${post.likes || 0})`;
    like.addEventListener("click", async () => {
      like.disabled = true;
      try {
        await request(`/posts/${encodeURIComponent(post.id)}/like`, { method: "POST" });
        await loadPosts();
      } catch (error) {
        showMessage(feedMessage, error.message, true);
      } finally {
        like.disabled = false;
      }
    });

    const comment = document.createElement("button");
    comment.type = "button";
    comment.textContent = `◯ Comment (${(post.comments || []).length})`;
    const commentsArea = document.createElement("div");
    commentsArea.className = "post-comments";
    commentsArea.hidden = !openCommentIds.has(post.id);
    comment.addEventListener("click", () => {
      commentsArea.hidden = !commentsArea.hidden;
      if (!commentsArea.hidden) commentForm.querySelector("input").focus();
    });

    const commentList = document.createElement("div");
    commentList.className = "comment-list";
    (post.comments || []).forEach((item) => {
      const commentItem = document.createElement("p");
      const commentAuthor = document.createElement("strong");
      commentAuthor.textContent = `${item.author}: `;
      commentItem.append(commentAuthor, document.createTextNode(item.text));
      commentList.append(commentItem);
    });

    const commentForm = document.createElement("form");
    commentForm.className = "comment-form";
    const commentInput = document.createElement("input");
    commentInput.type = "text";
    commentInput.name = "comment";
    commentInput.placeholder = "Write a comment...";
    commentInput.maxLength = 1000;
    commentInput.required = true;
    const commentSubmit = document.createElement("button");
    commentSubmit.type = "submit";
    commentSubmit.className = "btn btn-light";
    commentSubmit.textContent = "Send";
    commentForm.append(commentInput, commentSubmit);
    commentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      commentSubmit.disabled = true;
      try {
        await request(`/posts/${encodeURIComponent(post.id)}/comments`, {
          method: "POST",
          body: JSON.stringify({
            author: currentUser.name,
            text: commentInput.value.trim()
          })
        });
        await loadPosts(new Set([post.id]));
      } catch (error) {
        showMessage(feedMessage, error.message, true);
      } finally {
        commentSubmit.disabled = false;
      }
    });
    commentsArea.append(commentList, commentForm);

    const share = document.createElement("button");
    share.type = "button";
    share.textContent = "↗ Share";
    share.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(post.text);
        showMessage(feedMessage, "Post text copied to clipboard.");
      } catch {
        showMessage(feedMessage, "Clipboard access is unavailable in this browser.", true);
      }
    });

    actions.append(like, comment, share);
    card.append(meta, body, actions, commentsArea);
    postsList.append(card);
  });
};

const loadPosts = async (openCommentIds = new Set()) => {
  if (!postsList) return;
  try {
    const result = await request("/posts");
    const posts = result.posts || [];
    renderPosts(posts, openCommentIds);
    renderNotifications(posts);
    showMessage(feedMessage, "");
  } catch (error) {
    renderPosts([]);
    renderNotifications([]);
    showMessage(feedMessage, error.message, true);
  }
};

const postForm = document.getElementById("postForm");
if (postForm && currentUser) {
  loadPosts();
  postForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const textInput = document.getElementById("postText");
    const submitButton = postForm.querySelector('button[type="submit"]');
    const text = textInput.value.trim();
    if (!text) {
      showMessage(feedMessage, "Write an update before posting.", true);
      return;
    }

    submitButton.disabled = true;
    try {
      await request("/posts", {
        method: "POST",
        body: JSON.stringify({ author: currentUser.name, text })
      });
      textInput.value = "";
      showMessage(feedMessage, "Your update was posted.");
      await loadPosts();
    } catch (error) {
      showMessage(feedMessage, error.message, true);
    } finally {
      submitButton.disabled = false;
    }
  });
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(CURRENT_KEY);
    window.location.href = "index.html";
  });
}

const menuButton = document.querySelector(".icon-button");
const sidebar = document.querySelector(".sidebar");
if (menuButton && sidebar) {
  const isMobile = () => window.matchMedia("(max-width: 900px)").matches;
  menuButton.setAttribute("aria-expanded", String(!isMobile()));
  menuButton.addEventListener("click", () => {
    const mobile = isMobile();
    const expanded = mobile
      ? sidebar.classList.contains("is-open")
      : !sidebar.classList.contains("is-collapsed");
    menuButton.setAttribute("aria-expanded", String(!expanded));
    sidebar.classList.toggle(mobile ? "is-open" : "is-collapsed", !expanded);
  });
}
