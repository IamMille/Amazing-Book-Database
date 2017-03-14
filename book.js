
class Table {
  constructor() {
    this.IsWriting = null;
  }
  clear() {
    $("tbody")[0].innerHTML = "";
  }
  enableAdd() {
    $("#addBook").classList.remove("disabled");
    $("#title").disabled = false;
    $("#author").disabled = false;
  }
  disableAdd() {
    $("#addBook").classList.add("disabled");
    $("#title").disabled = true;
    $("#author").disabled = true;
  }
  enableLists() {
    $("button")[1].classList.remove("disabled");
    $("select")[0].disabled = false;
  }
  disableLists() {
    $("button")[1].classList.add("disabled");
    $("select")[0].disabled = true;
  }
  clearAdd() {
    $("th input").forEach( el => el.value = "" );
  }
  isLoading(isTrue) {
    if (isTrue) {
      $("#loading").style.display = "table-row";
      //$table.disableAdd();
      //$table.disableLists();
    }
    else {
      $("#loading").style.display = "none";
      //$table.enableAdd();
      //$table.enableLists();
    }
  }
  getBookFromRow(tr) {
    var td = tr.querySelectorAll("td");
    var book = {
      id: td[0].innerText || null,
      title: td[1].innerText || null,
      author: td[2].innerText || null
    };
    return book;
  }
} // MVC: controller view
let $table = new Table();

class App
{
  constructor() {
    this.cfg = {
      fetchDelay: 1,
      userLists: null,
      userBooks: null
    };
  }
  loadSettings()
  {
    this.cfg = JSON.parse(sessionStorage.getItem("settings")) || this.cfg;
    if (this.cfg.userLists) $("#pickedList").innerHTML = this.cfg.userLists;
    if (this.cfg.userBooks) $("#books").innerHTML = this.cfg.userBooks;
    console.log("loadSettings", getPickedList("value"));
    if (!getPickedList("value")) $table.disableAdd();
    alertify.log("Session restored.");
  }
  saveSettings()
  {
    var selected = getPickedList("elm");
    $("option[selected]").forEach( el => el.removeAttribute("selected") );
    selected.setAttribute("selected", ""); // mark truly selected in DOM before save
    this.cfg.userLists = $("#pickedList").innerHTML;
    this.cfg.userBooks = $("#books").innerHTML;
    sessionStorage.setItem("settings", JSON.stringify(this.cfg));
    console.log("App saveSettings() complete");
  }
  fetchDelay(val) {
    if (val) this.cfg.fetchDelay = val;
    else return this.cfg.fetchDelay;
  }
}
let $app = new App();

window.addEventListener("load", () =>
{
  $.noConflict(); // disabe bootstraps jQuery

  alertify.logPosition("bottom right");
  alertify.maxLogItems(2);

  $app.loadSettings();

  $("tbody tr").forEach( tr => {
    tr.querySelectorAll("span").forEach(
      el => el.addEventListener("click", btnClick));

    tr.querySelectorAll("td[contenteditable=true]").forEach( el => {
      el.addEventListener("keydown", onInputValidate);
      el.addEventListener("keyup", onInputSave);
      el.addEventListener("focusout", (e) => { onInputSave(e,123); }); // TODO: bind? david
    });
  });

  $("#pickedList")
    .addEventListener("change", changePickedList);
  $("button")
    .forEach( el => el.addEventListener("click", btnClick) );
  $("ul li a")
    .forEach( el => el.addEventListener("click", navClick) );
  $("input")
    .forEach( el => el.addEventListener("keydown", onInputValidate) );

  window.addEventListener("online",  onInternet);
  window.addEventListener("offline", onInternet);

  $table.isLoading(false);
  onInternet();

  //if (navigator.onLine) setTimeout( getAllBooks, 2000);
});

function changePickedList()
{
  var el = document.getElementById("pickedList");
  var txt = el.options[el.selectedIndex].innerText;

  if (txt == "Choose list")
    $table.disableAdd();
  if (txt == "Create new")
    createList();
  else
    getAllBooks();
}
function createList()
{
  $("option")[0].selected = true;

  alertify.prompt("Enter a name for your new list", (input, e) =>
  { // okButton
    e.preventDefault();
    alertify.success("Added new list: " + input);
    $table.isLoading(true);
    $table.disableLists();

    apiFetch({
        requestKey: ""
      }, (api) => {
        alertify.log("New list successfully added.");
        console.log("New API key: ", api.key);

        $("select option[selected]")
          .forEach( el => el.removeAttribute("selected") );

        var opt = document.createElement("option");
        opt.value = api.key; //api.key
        opt.innerText = input;
        $("select")[0].insertBefore(opt, $("optgroup[label='───────']")[0]);
        opt.selected = true;

        $table.clear();
        $table.isLoading(false);
        $app.saveSettings();
        //getAllBooks();
      });
    }, (e) => { // cancelButton
      event.preventDefault();
      $table.disableAdd();
  });
}

function onInternet(e)
{
  if (navigator.onLine && e) { // only if triggered by event
    alertify.success("Internet back online!");
    $table.enableAdd();
    $table.enableLists();
    getAllBooks();
  }
  else if (!navigator.onLine) { //e.type == "offline"
    $table.disableAdd();
    $table.disableLists();
    alertify.error("Internet is offline?");
  }
}

function apiFetch(options, callback, retry=8)
{
  if (getPickedList("value").length != 5 && options.requestKey !== "") {
    console.error("The API key seams unvalid."); return; }
  if (!options) {
    console.error("apiFetch called without options"); return; }

  options.key = getPickedList("value"); // apiKey

  var URI = Object.keys(options).map(
      key => key + "=" + encodeURIComponent(options[key])
    ).join("&");

  var url = "https://www.forverkliga.se/JavaScript/api/crud.php?" + URI;
  console.log(url);

  if ($app.fetchDelay() > 0)
    alertify.log("Sending API request.");

  sleep( $app.fetchDelay() ).then( () => {

    fetch(url)
      .then(resp => resp.json())
      .then(data =>
      {
        if (data.status != "success") {
          if (data.message.match("No book with that id") ||
              data.message.match("Bad API key")) retry = 0;
          return Promise.reject("Fetch unsuccessful (" + (retry-1) + " retries left): <br \>" + "\"" + data.message + "\"");
        }

        callback(data);
        $app.saveSettings();
      })
      .catch(error =>
      {
        alertify.error(error); console.warn(error);
        if (--retry > 0)
          apiFetch(options, callback, retry);
        else
          $table.isLoading(false);
    });

  });  //sleep
}

function btnClick()
{
  var btn = this.innerText;

  if (this.classList.contains("glyphicon-pencil"))
    btn = "Edit";
  else if (this.classList.contains("glyphicon-trash"))
    btn = "Delete";

  console.log(btn, this);

  switch (btn) {
    case "Add": addBook(); break;
    case "Edit": editBook(this); break;
    case "Delete": deleteBook(this); break;
    case "Update": getAllBooks(); break;
  }
}

function navClick()
{
  var btn = this.innerText;
  switch (btn) {
    case "Add books from API":
      importBooks();
      break;
    case "Set fetch delay":
      applyDelay();
      break;
    case "Try random API key":
      $("option[value='random']")[0].selected = true;
      getAllBooks();
      break;
  }
}
function applyDelay() {
  alertify.prompt("Enter new delay before fetch, in miliseconds (0-5000)",
    (input, e) => { // okButton
      e.preventDefault();
      if (isNaN(input) || !(Number(input) >= 0 && Number(input) <= 5000)) {
        alert("Input must be a number between 0-5000."); return; }

      $app.fetchDelay(input);
      $app.saveSettings();
      alertify.success("New delay is: " + input + " ms");

    }, (e) => {
      e.preventDefault();
    });
}
function getAllBooks() // ok
{
  if (!getPickedList("value")) {
    console.log("getAllBooks(): pickedList has no value."); return; }

  $table.clear();
  $table.isLoading(true);
  $table.disableLists();

  apiFetch({
      op: "select"
    }, (api) => {
      $table.isLoading(false);
      $table.enableLists();

      if (api.data && api.data.length > 0)
        api.data.forEach(book => createBook(book));

      alertify.success("Updated from server.");
  });
}

function createBook(obj)
{
  if (!obj) return;

  var tr = document.createElement("tr");
  if (obj.inactive) tr.classList.add("inactive");

  var html = `
      <td data-toggle="tooltip"
          title="${obj.updated}">
          ${obj.id}</td>
      <td contenteditable="true">${obj.title}</td>
      <td contenteditable="true">${obj.author}</td>
      <td>
          <span class="glyphicon glyphicon-pencil"></span>
          <span class="glyphicon glyphicon-trash"></span>
      </td>
  `;
  tr.innerHTML = html;

  tr.querySelectorAll("span").forEach(
    el => el.addEventListener("click", btnClick));

  tr.querySelectorAll("td[contenteditable=true]").forEach( el => {
    el.addEventListener("keydown", onInputValidate);
    el.addEventListener("keyup", onInputSave);
    el.addEventListener("focusout", (e) => { onInputSave(e,123); }); // TODO: bind? david
  });

  $("#books").prepend(tr);

  return tr;
}

function addBook(title, author)
{
  if (!title) title = $("#title").value;
  if (!author) author = $("#author").value;

  if (!(title.length > 0 || author.length > 0)) {
    alert("Both book name and author need to have a value."); return; }

  $table.disableAdd();

  var tr = createBook({
    id: "",
    author: author,
    title: title,
    updated: "~" + datetime(), // preliminary
    inactive: true
  });
  //console.log(tr);

  apiFetch({
      op: "insert",
      title: title,
      author: author
    }, (data) => {
      tr.querySelector("td").innerText = data.id;
      tr.querySelector("td").setAttribute( "title", datetime() );
      tr.classList.remove("inactive");
      $table.enableAdd();
      $table.clearAdd();
      alertify.success("Book successfully added.");
  });
}

function deleteBook(self) //ok
{
  var tr = self.parentElement.parentElement;
  var book = $table.getBookFromRow(tr);
  console.log("deleteBook", book);

  // book already waiting (to be added) through API
  if (!book.id && tr.classList.contains("inactive"))
      tr.outerHTML = ""; // force delete from DOM

  if (!book.id) {
    console.info("deleteBook: removed unsynced book"); return; }

  tr.classList.add("inactive");

  apiFetch({
    op: "delete",
    id: book.id
  }, (data) => {
    console.log("deleteBook done", data);
    tr.outerHTML = "";
    alertify.success("Book successfully deleted.");
  });
}

function editBook(self) //??
{
  var tr = self.parentElement.parentElement;
  //var book = $table.getBookFromRow(tr);
  var td = tr.querySelector("td:nth-child(2)");
  td.focus();
}

function onInputValidate(e) //ok
{ // keydown
  var regex = /^[A-ZÅÄÖa-zåäö0-9 -]$/;
  if (e.key == "Meta" || e.key == "ArrowLeft" || e.key == "ArrowRight")
    {}
  else if (!(e.key == "Backspace" || regex.test(e.key)))
    e.preventDefault(); // not allowed chars
  else if (e.target.nodeName == "TD")
    e.target.setAttribute("data-dirty", "");
}

function onInputSave(e, timeout=1600) //ok
{ // keyup
  if (!e.target.hasAttribute("data-dirty"))
    return;

  if ($table.IsWriting)
    clearTimeout($table.IsWriting);

  var book = $table.getBookFromRow( e.target.parentElement );

  $table.IsWriting = setTimeout(() => {
    apiFetch({
      op: "update",
      id: book.id,
      title: book.title,
      author: book.author
    }, (data) => {
      console.log("onInputSave done", data);
      e.target.removeAttribute("data-dirty"); //clear dirty
      alertify.success("Book successfully updated.");
    });
  }, timeout);

}

function importBooks()
{
  alertify.prompt("Enter the number of books you want to import (1-7)", (input, e) =>
  { // okButton
    e.preventDefault();

    if (isNaN(input) || !(Number(input) > 0 && Number(input) < 8)) {
      alert("Input must be a number between 1-7."); return; }

    var url = "https://www.librarything.com/api_getdata.php?userid=cctesttc1&showstructure=1&showCollections=0&showTags=1&booksort=random&responseType=json&max=" + input;

    fetch(url)
      .then(resp => resp.json())
      .then(data => {

        if (!Object.keys(data.books).length) {
          console.warn("importBooks(): No books from API?"); return; }

        for (var prop in data.books) {
          var book = data.books[prop];
          console.log("Book:", book.title, book.author_fl);
          var tr = addBook(book.title, book.author_fl);
        }

      })
      .catch(error => {
          console.error("importBooks() error:", error);
    }); // fetch end

  }, (e) => { // cancelButton
    e.preventDefault();
  });
}

// .alert-success, .alert-info, .alert-warning or .alert-danger
function msg(str, timeout=850) // not used
{
  $("#statusbar").innerText = str;
  setTimeout( () => { $("#statusbar").innerText = "Running"; }, timeout); //default
}

function $(str)
{
  var els = document.querySelectorAll(str);
  if (els.length === 1 && str.indexOf("#") > -1) return els[0];
  else if (els.length > 0) return Array.from(els);
  else return [ document.createElement('xyz'),
                document.createElement('xyz'),
                document.createElement('xyz') ]; // FIXME: dummy elements for forEach
}

function datetime() {
  return (new Date()).toISOString().replace('T', ' ').replace(/\..*$/, '');
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function getPickedList(prop="value") { // value, innerText, etc

  var el = document.getElementById("pickedList");
  var val = el.options[el.selectedIndex].value;

  if (prop == "elm")
    return el.options[el.selectedIndex];
  if (val != "random")
    return el.options[el.selectedIndex].getAttribute(prop) || "";

  return genApiKey();
}
function genApiKey(length=5, current='') {
  return !length ? current : genApiKey( --length,
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz"
        .charAt( Math.floor( Math.random() * 60 ) ) + current );
}

HTMLElement.prototype.prepend = function(el) {
    if (this.firstChild) this.insertBefore(el, this.firstChild);
    else this.appendChild(el);
};
