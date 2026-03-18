/**
 * Main Menu Scene
 * Handles the main menu UI and initialization
 */
export class MainMenuScene {
  constructor() {
    this.container = null;
    this.onStartCallback = null;
  }

  init(onStart) {
    this.onStartCallback = onStart;
    this.createUI();
  }

  createUI() {
    // Create main menu container
    this.container = document.createElement("div");
    this.container.id = "main-menu";
    this.container.innerHTML = `
      <div class="menu-background"></div>
      <div class="menu-content">
        <h1 class="menu-title">Find food before starvation claims you.</h1>
        <button id="start-button" class="start-button">Begin Survival</button>
      </div>
    `;

    // Add styles
    const style = document.createElement("style");
    style.textContent = `
      #main-menu {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .menu-background {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: url('${import.meta.env.BASE_URL}Images/bgImage.png') center/cover no-repeat;
        opacity: 0.9;
      }

      .menu-content {
        position: relative;
        z-index: 1;
        text-align: center;
        padding: 2rem;
        max-width: 90%;
      }

      .menu-title {
        font-family: 'Courier New', monospace;
        font-size: clamp(1.5rem, 4vw, 3rem);
        font-weight: bold;
        color: #ffffff;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        margin-bottom: 3rem;
        line-height: 1.2;
      }

      .start-button {
        font-family: 'Courier New', monospace;
        font-size: clamp(1.2rem, 3vw, 2rem);
        padding: 1rem 3rem;
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        border: none;
        border-radius: 50px;
        cursor: pointer;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 2px;
      }

      .start-button:hover {
        transform: translateY(-3px);
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
      }

      .start-button:active {
        transform: translateY(-1px);
      }

      @media (max-width: 768px) {
        .menu-content {
          padding: 1rem;
        }

        .menu-title {
          margin-bottom: 2rem;
        }

        .start-button {
          padding: 0.8rem 2rem;
        }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(this.container);

    // Add event listener
    const startButton = document.getElementById("start-button");
    startButton.addEventListener("click", () => {
      this.hide();
      if (this.onStartCallback) {
        this.onStartCallback();
      }
    });
  }

  show() {
    if (this.container) {
      this.container.style.display = "flex";
    }
  }

  hide() {
    if (this.container) {
      this.container.style.display = "none";
    }
  }

  destroy() {
    if (this.container) {
      this.container.remove();
    }
  }
}

