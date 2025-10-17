'use strict';
// ELEMENT TOGGLE FUNCTION: ESSA FUNÇÃO ALTERA A CLASSE "ACTIVE" DE UM ELEMENTO
const elementToggleFunc = function (elem) {elem.classList.toggle("active"); }
// SIDEBAR VARIABLES: SELECIONA O SIDEBAR E O BOTÃO DO SIDEBAR
const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");
// SIDEBAR TOGGLE FUNCTIONALITY FOR MOBILE: ADICIONA A FUNÇÃO DE TOGGLE NO SIDEBAR QUANDO O BOTÃO É CLICADO
sidebarBtn.addEventListener("click", function () {elementToggleFunc(sidebar); });
// TESTIMONIALS VARIABLES: SELECIONA ELEMENTOS DO TESTIMONIAL E MODAL
const testimonialsItem = document.querySelectorAll("[data-testimonials-item]");
const modalContainer = document.querySelector("[data-modal-container]");
const modalCloseBtn = document.querySelector("[data-modal-close-btn]");
const overlay = document.querySelector("[data-overlay]");
// MODAL VARIABLES: SELECIONA OS ELEMENTOS DENTRO DO MODAL (IMAGEM, TÍTULO, TEXTO)
const modalImg = document.querySelector("[data-modal-img]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalText = document.querySelector("[data-modal-text]");
// MODAL TOGGLE FUNCTION: ALTERA A CLASSE "ACTIVE" DO MODAL E DO OVERLAY
const testimonialsModalFunc = function () {
  modalContainer.classList.toggle("active");
  overlay.classList.toggle("active");
}
// ADD CLICK EVENT TO ALL MODAL ITEMS: ABRE O MODAL QUANDO UM ITEM DE TESTIMONIAL É CLICADO
for (let i = 0; i < testimonialsItem.length; i++) {
  testimonialsItem[i].addEventListener("click", function () {
    // ATUALIZA O MODAL COM AS INFORMAÇÕES DO ITEM CLICADO
    modalImg.src = this.querySelector("[data-testimonials-avatar]").src;
    modalImg.alt = this.querySelector("[data-testimonials-avatar]").alt;
    modalTitle.innerHTML = this.querySelector("[data-testimonials-title]").innerHTML;
    modalText.innerHTML = this.querySelector("[data-testimonials-text]").innerHTML;
    // ABRE O MODAL
    testimonialsModalFunc();
  });
}
// ADD CLICK EVENT TO MODAL CLOSE BUTTON: FECHA O MODAL QUANDO O BOTÃO DE FECHAR OU O OVERLAY SÃO CLICADOS
modalCloseBtn.addEventListener("click", testimonialsModalFunc);
overlay.addEventListener("click", testimonialsModalFunc);
// CUSTOM SELECT VARIABLES: SELECIONA O SELECT CUSTOMIZADO E OS ITENS DO SELECT
const select = document.querySelector("[data-select]");
const selectItems = document.querySelectorAll("[data-select-item]");
const selectValue = document.querySelector("[data-selecct-value]"); // CORRIGIDO O SELETOR ERRADO
const filterBtn = document.querySelectorAll("[data-filter-btn]");
// ADD CLICK EVENT TO CUSTOM SELECT: ABRE O DROPDOWN DO SELECT QUANDO CLICADO
select.addEventListener("click", function () { 
  elementToggleFunc(this); 
});
// ADD EVENT IN ALL SELECT ITEMS: ATUALIZA O SELECT COM O ITEM CLICADO E APLICA O FILTRO
for (let i = 0; i < selectItems.length; i++) {
  selectItems[i].addEventListener("click", function () {
    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    elementToggleFunc(select);
    filterFunc(selectedValue);
  });
}
// FILTER VARIABLES: SELECIONA OS ITENS QUE SERÃO FILTRADOS
const filterItems = document.querySelectorAll("[data-filter-item]");
// FILTER FUNCTION: APLICA O FILTRO NOS ITENS BASEADO NO VALOR SELECIONADO
const filterFunc = function (selectedValue) {
  for (let i = 0; i < filterItems.length; i++) {
    if (selectedValue === "all") {
      filterItems[i].classList.add("active");
    } else if (selectedValue === filterItems[i].dataset.category) {
      filterItems[i].classList.add("active");
    } else {
      filterItems[i].classList.remove("active");
    }
  }
}
// ADD EVENT IN ALL FILTER BUTTON ITEMS FOR LARGE SCREEN: APLICA O FILTRO QUANDO UM BOTÃO É CLICADO EM TELAS MAIORES
let lastClickedBtn = filterBtn[0]; // ARMAZENA O ÚLTIMO BOTÃO CLICADO
for (let i = 0; i < filterBtn.length; i++) {
  filterBtn[i].addEventListener("click", function () {
    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    filterFunc(selectedValue);

    lastClickedBtn.classList.remove("active");
    this.classList.add("active");
    lastClickedBtn = this;
  });
}
// CONTACT FORM VARIABLES: SELECIONA O FORMULÁRIO E SEUS CAMPOS
const form = document.querySelector("[data-form]");
const formInputs = document.querySelectorAll("[data-form-input]");
const formBtn = document.querySelector("[data-form-btn]");
// ADD EVENT TO ALL FORM INPUT FIELD: VERIFICA A VALIDAÇÃO DO FORMULÁRIO E ATIVA/DESATIVA O BOTÃO DE ENVIO
for (let i = 0; i < formInputs.length; i++) {
  formInputs[i].addEventListener("input", function () {
    if (form.checkValidity()) {
      formBtn.removeAttribute("disabled");
    } else {
      formBtn.setAttribute("disabled", "");
    }
  });
}
// PAGE NAVIGATION VARIABLES: SELECIONA OS LINKS DE NAVEGAÇÃO E AS PÁGINAS
const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");
// ADD EVENT TO ALL NAV LINK: MUDA A PÁGINA ATIVA QUANDO UM LINK É CLICADO
for (let i = 0; i < navigationLinks.length; i++) {
  navigationLinks[i].addEventListener("click", function () {
    for (let i = 0; i < pages.length; i++) {
      if (this.innerHTML.toLowerCase() === pages[i].dataset.page) {
        pages[i].classList.add("active");
        navigationLinks[i].classList.add("active");
        window.scrollTo(0, 0); // SCROLL PARA O TOPO
      } else {
        pages[i].classList.remove("active");
        navigationLinks[i].classList.remove("active");
      }
    }
  });
}