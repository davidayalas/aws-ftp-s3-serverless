$(function() {

    // preventing page from redirecting
    $("html").on("dragover", function(e) {
        e.preventDefault();
        e.stopPropagation();
        $("h1").text("Drag here");
    });

    $("html").on("drop", function(e) { e.preventDefault(); e.stopPropagation(); });

    // Drag enter
    $('.upload-area').on('dragenter', function (e) {
        e.stopPropagation();
        e.preventDefault();
        $("h1").text("Drop");
    });

    // Drag over
    $('.upload-area').on('dragover', function (e) {
        e.stopPropagation();
        e.preventDefault();
        $("h1").text("Drop");
    });

    // Drop
    $('.upload-area').on('drop', function (e) {
        e.stopPropagation();
        e.preventDefault();
        $("h1").text("Upload");
        var file = e.originalEvent.dataTransfer.files;
        uploadData(generateFormData(file[0]));
    });

    function generateFormData(file){
        var fd = new FormData();
        $("#upload input").each(function(item){
            if(["file","submit"].indexOf(this.name)===-1){
                fd.append(this.name, this.value);
            }
        })
        fd.append('file', file);
        return fd;
    }

    // Sending AJAX request and upload file
    function uploadData(formdata){
        $("h1").text("Uploading...");
        $.ajax({
            url: $("#upload").attr("action"),
            type: 'POST',
            data: formdata,
            processData: false,
            dataType: 'json',
            contentType: false,
            success: function(response){
                $("h1").text("Uploaded!");
            }
        });
    }

    // Open file selector on div click
    $("#uploadfiledrag").click(function(){
        $("#uploadfile").click();
    });

    // file selected
    $("#uploadfile").change(function(){
        uploadData(generateFormData($('#uploadfile')[0].files[0]));
    });
});